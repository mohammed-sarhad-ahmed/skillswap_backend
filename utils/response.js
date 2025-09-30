export default function response(
  res,
  message,
  data = null,
  statusCode = 200,
  status = 'Success'
) {
  res.status(statusCode).json({
    message,
    status,
    data
  });
}
