// controllers/appointmentController.js
import path from "path";
import Appointment from "../models/appointments.js";
import { UserModel } from "../models/user.js";
import AppError from "../utils/app_error.js";
import response from "../utils/response.js";

// In controllers/appointmentController.js - Update createAppointment function
export const createAppointment = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(
        new AppError("You are not logged in! Please log in to get access.", 401)
      );
    }

    const { teacher, student, date, time, title, description, courseId, week } =
      req.body;

    // Validate required fields
    if (!teacher || !student || !date || !time) {
      return next(
        new AppError("Teacher, student, date, and time are required", 400)
      );
    }

    // Prevent double booking for teacher
    const existingTeacherAppointment = await Appointment.findOne({
      teacher,
      date,
      time,
      status: { $ne: "canceled" },
    });

    if (existingTeacherAppointment) {
      return next(
        new AppError("This time slot is already booked for the teacher.", 400)
      );
    }

    // Prevent double booking for student
    const existingStudentAppointment = await Appointment.findOne({
      student,
      date,
      time,
      status: { $ne: "canceled" },
    });

    if (existingStudentAppointment) {
      return next(
        new AppError("You already have an appointment at this time.", 400)
      );
    }

    // Check student credits
    const studentUser = await UserModel.findById(student);
    if (!studentUser) {
      return next(new AppError("Student not found.", 404));
    }

    if (studentUser.credits <= 0) {
      return next(
        new AppError(
          "You don't have enough credits to book an appointment.",
          400
        )
      );
    }

    // Deduct one credit from student
    studentUser.credits -= 1;
    await studentUser.save();

    // Create appointment
    const appointment = await Appointment.create({
      teacher,
      student,
      date,
      time,
      title: title || "Course Session",
      description: description || "",
      courseId: courseId || null,
      week: week || null,
      status: "pending",
      proposedBy: req.user._id,
    });

    response(
      res,
      "Appointment created successfully. 1 credit deducted from student.",
      { appointment },
      201,
      "Success"
    );
  } catch (err) {
    next(err);
  }
};

// Get appointments
export const getAppointments = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new AppError("You are not logged in!", 401));
    }

    const { teacher, student } = req.query;
    const filter = {};
    if (teacher) filter.teacher = teacher;
    if (student) filter.student = student;

    const appointments = await Appointment.find(filter)
      .populate({
        path: "teacher",
        populate: "teachingSkills learningSkills",
      })
      .populate({
        path: "student",
        populate: "teachingSkills learningSkills",
      })
      .sort({ date: 1, time: 1 });

    response(res, "Appointments fetched successfully", appointments);
  } catch (err) {
    next(err);
  }
};

// Get a single appointment
export const getAppointment = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new AppError("You are not logged in!", 401));
    }

    const appointment = await Appointment.findById(req.params.id)
      .populate("teacher")
      .populate("student");

    if (!appointment) {
      return next(new AppError("Appointment not found", 404));
    }

    response(res, "Appointment fetched successfully", appointment);
  } catch (err) {
    next(err);
  }
};

// Update appointment status (handles cancel refund)
export const updateAppointmentStatus = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new AppError("You are not logged in!", 401));
    }

    const { status } = req.body;
    const validStatuses = [
      "pending",
      "confirmed",
      "ongoing",
      "completed",
      "canceled",
    ];
    if (!validStatuses.includes(status)) {
      return next(new AppError("Invalid status.", 400));
    }

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return next(new AppError("Appointment not found.", 404));
    }

    // If appointment is canceled, refund credit to student
    if (status === "canceled" && appointment.status !== "canceled") {
      const studentUser = await UserModel.findById(appointment.student);
      if (studentUser) {
        studentUser.credits += 1;
        await studentUser.save();
      }
    }

    appointment.status = status;
    await appointment.save();

    response(res, "Appointment status updated successfully", appointment);
  } catch (err) {
    next(err);
  }
};

// Update appointment schedule (reschedule)
export const updateAppointmentSchedule = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new AppError("You are not logged in!", 401));
    }

    const { status, date, time, teacher } = req.body;

    // Validate status if provided
    const validStatuses = [
      "pending",
      "confirmed",
      "ongoing",
      "completed",
      "canceled",
    ];
    if (status && !validStatuses.includes(status)) {
      return next(new AppError("Invalid status.", 400));
    }

    // Prevent double booking
    const existing = await Appointment.findOne({
      teacher,
      date,
      time,
      status: { $ne: "canceled" },
    });

    if (existing) {
      return next(new AppError("This time slot is already booked.", 400));
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (date) updateData.date = date;
    if (time) updateData.time = time;

    if (Object.keys(updateData).length === 0) {
      return next(new AppError("No valid fields to update.", 400));
    }

    const appointment = await Appointment.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );

    if (!appointment) {
      return next(new AppError("Appointment not found.", 404));
    }

    response(res, "Appointment updated successfully", appointment);
  } catch (err) {
    next(err);
  }
};

// Delete appointment
export const deleteAppointment = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new AppError("You are not logged in!", 401));
    }

    const appointment = await Appointment.findByIdAndDelete(req.params.id);
    if (!appointment) {
      return next(new AppError("Appointment not found.", 404));
    }

    response(res, "Appointment deleted successfully", null);
  } catch (err) {
    next(err);
  }
};
export const nextAppointment = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new AppError("You are not logged in!", 401));
    }

    const now = new Date();
    const nowUTC = new Date(now.toISOString());

    const appointments = await Appointment.find({
      $or: [{ student: req.user._id }, { teacher: req.user._id }],
      status: "confirmed",
    })
      .sort({ date: 1, time: 1 })
      .populate("teacher")
      .populate("student");

    if (!appointments.length) {
      return response(res, "No upcoming appointments found.", null);
    }

    // Find the first upcoming appointment OR any currently active appointment
    const upcoming = appointments.find((appt) => {
      // Parse the ISO date string directly - no need to split
      const sessionStart = new Date(appt.date);

      // Extract hours and minutes from the time string and add to session start
      const [hours, minutes] = appt.time.split(":").map(Number);
      sessionStart.setHours(hours, minutes, 0, 0);

      const sessionEnd = new Date(sessionStart.getTime() + 60 * 60 * 1000); // 1 hour session

      // Return true if session is currently active OR in the future
      return nowUTC >= sessionStart && nowUTC <= sessionEnd;
    });

    // If no active session, find the next future session
    const nextSession =
      upcoming ||
      appointments.find((appt) => {
        const sessionStart = new Date(appt.date);
        const [hours, minutes] = appt.time.split(":").map(Number);
        sessionStart.setHours(hours, minutes, 0, 0);

        return sessionStart > nowUTC;
      });

    if (!nextSession) {
      return response(res, "No upcoming appointments found.", null);
    }

    response(res, "Next appointment fetched successfully", {
      appointment: nextSession,
    });
  } catch (err) {
    console.log(err);
    next(err);
  }
};

// New endpoint for active sessions
export const activeAppointment = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new AppError("You are not logged in!", 401));
    }

    const now = new Date();
    const nowUTC = new Date(now.toISOString());

    const appointments = await Appointment.find({
      $or: [{ student: req.user._id }, { teacher: req.user._id }],
      status: "confirmed",
    })
      .populate("teacher")
      .populate("student");

    // Find any currently active appointment
    const activeAppointment = appointments.find((appt) => {
      // Parse the ISO date string directly
      const sessionStart = new Date(appt.date);

      // Extract hours and minutes from the time string and add to session start
      const [hours, minutes] = appt.time.split(":").map(Number);
      sessionStart.setHours(hours, minutes, 0, 0);

      const sessionEnd = new Date(sessionStart.getTime() + 60 * 60 * 1000);

      return nowUTC >= sessionStart && nowUTC <= sessionEnd;
    });

    if (!activeAppointment) {
      return response(res, "No active appointments found.", null);
    }

    response(res, "Active appointment fetched successfully", {
      appointment: activeAppointment,
    });
  } catch (err) {
    console.log(err);
    next(err);
  }
};

// Add this to your backend
export const endAppointment = async (req, res, next) => {
  try {
    const { id } = req.params;

    const appointment = await Appointment.findByIdAndUpdate(
      id,
      { status: "completed" },
      { new: true }
    );

    if (!appointment) {
      return next(new AppError("Appointment not found", 404));
    }

    response(res, "Appointment ended successfully", {
      appointment,
    });
  } catch (err) {
    console.log(err);
    next(err);
  }
};
