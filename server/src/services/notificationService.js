/** Socket.IO real-time alert plus an SMS integration placeholder for local development. */
export function sendDonorAlert(io, { donor, request, notification, hospital }) {
  const payload = {
    notificationId: String(notification._id),
    requestId: String(request._id),
    bloodGroupRequired: request.bloodGroupRequired,
    unitsNeeded: request.unitsNeeded,
    urgency: request.urgency,
    distanceKm: notification.distanceKm,
    radiusKm: notification.radiusKm,
    status: notification.status,
    hospital: {
      name: hospital?.name || "Hospital",
      phone: hospital?.phone || request.contactNumber,
      address: hospital?.address || "",
    },
    createdAt: request.createdAt,
    message: `Urgent ${request.bloodGroupRequired} blood request within ${notification.distanceKm} km. Please open BloodBridge to respond.`,
  };

  if (io) {
    io.to(`donor:${donor._id}`).emit("blood:request:new", payload);
  }

  // Replace this log with Twilio's Messages API after adding credentials and consent flow.
  const maskedPhone = donor.phone ? `${donor.phone.slice(0, 3)}****${donor.phone.slice(-3)}` : "unknown";
  console.info(`[SMS PLACEHOLDER] donor=${maskedPhone} request=${request._id} group=${request.bloodGroupRequired} urgency=${request.urgency}`);
}
