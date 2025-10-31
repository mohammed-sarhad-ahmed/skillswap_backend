// controllers/appointmentController.js
import Appointment from "../models/appointments.js";
import { UserModel } from "../models/user.js";
import AppError from "../utils/app_error.js";
import response from "../utils/response.js";

// Create a new appointment
export const createAppointment = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(
        new AppError("You are not logged in! Please log in to get access.", 401)
      );
    }

    const { teacher, date, time } = req.body;
    const student = req.user._id;

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
      status: "pending",
    });

    response(
      res,
      "Appointment created successfully. 1 credit deducted from student.",
      appointment,
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
      .populate("teacher")
      .populate("student")
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
    const validStatuses = ["pending", "confirmed", "completed", "canceled"];
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
    const validStatuses = ["pending", "confirmed", "completed", "canceled"];
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

    const appointment = await Appointment.findOne({
      $or: [{ student: req.user._id }, { teacher: req.user._id }],
      date: { $gte: now },
      status: "confirmed",
    })
      .sort({ date: 1, time: 1 })
      .populate("teacher")
      .populate("student");

    if (!appointment) {
      return response(res, "No upcoming appointments found.", null);
    }

    response(res, "Next appointment fetched successfully", { appointment });
  } catch (err) {
    console.log(err);
    next(err);
  }
};
