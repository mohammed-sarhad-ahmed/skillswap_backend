// controllers/appointmentController.js
import Appointment from "../models/appointments.js";
import AppError from "../utils/app_error.js";
import response from "../utils/response.js"; // make sure this path is correct

// Create a new appointment
export const createAppointment = async (req, res, next) => {
  if (!req.user) {
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401)
    );
  }

  const { teacher, date, time } = req.body;
  const student = req.user._id; // logged-in user is the student

  // Prevent double booking
  const existing = await Appointment.findOne({ teacher, date, time });
  if (existing) {
    return next(new AppError("This time slot is already booked.", 400));
  }

  const appointment = await Appointment.create({
    teacher,
    student,
    date,
    time,
  });
  response(
    res,
    "Appointment created successfully",
    appointment,
    201,
    "Success"
  );
};

export const getAppointments = async (req, res, next) => {
  if (!req.user) {
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401)
    );
  }

  const { teacher, student } = req.query;
  const filter = {};
  if (teacher) filter.teacher = teacher;
  if (student) filter.student = student;

  const appointments = await Appointment.find(filter)
    .populate("teacher", "fullName email")
    .populate("student", "fullName email")
    .sort({ date: 1, time: 1 });

  response(res, "Appointments fetched successfully", appointments);
};

// Get a single appointment by ID
export const getAppointment = async (req, res, next) => {
  if (!req.user) {
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401)
    );
  }

  const appointment = await Appointment.findById(req.params.id)
    .populate("teacher", "fullName email")
    .populate("student", "fullName email");

  if (!appointment) {
    return next(new AppError("Appointment not found", 404));
  }

  response(res, "Appointment fetched successfully", appointment);
};

// Update appointment status
export const updateAppointmentStatus = async (req, res, next) => {
  if (!req.user) {
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401)
    );
  }

  const { status } = req.body;
  const validStatuses = ["pending", "confirmed", "completed", "canceled"];
  if (!validStatuses.includes(status)) {
    return next(new AppError("Invalid status", 400));
  }

  const appointment = await Appointment.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true }
  );

  if (!appointment) {
    return next(new AppError("Appointment not found", 404));
  }

  response(res, "Appointment status updated successfully", appointment);
};

export const deleteAppointment = async (req, res, next) => {
  if (!req.user) {
    return next(
      new AppError("You are not logged in! Please log in to get access.", 401)
    );
  }

  const appointment = await Appointment.findByIdAndDelete(req.params.id);
  if (!appointment) {
    return next(new AppError("Appointment not found", 404));
  }

  response(res, "Appointment deleted successfully", null);
};
