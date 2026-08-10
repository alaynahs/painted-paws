export const BUSINESS_NAME = "Painted Paws";
export const BUSINESS_EMAIL = "booking@paintedpawsaustin.com";
export const BUSINESS_ADDRESS = "304 Lemon Light Lane, Pflugerville, TX";
export const BUSINESS_PHONE_DISPLAY = "(515) 553-9585";
export const BUSINESS_PHONE_TEL = "+15155539585";
export const REVIEW_LINK =
  process.env.NEXT_PUBLIC_REVIEW_LINK || "https://share.google/NFbmSKFrnlSnjLjHD";

export interface EmailContent {
  subject: string;
  body: string;
}

export function couponGrantedEmail(vars: {
  firstName: string;
  discountLabel: string;
}): EmailContent {
  return {
    subject: "You've got a coupon! 🎉",
    body: `Hi ${vars.firstName},

You got a coupon! Enjoy ${vars.discountLabel} at your next visit with ${BUSINESS_NAME}.

Just select "Use my available coupon" when you book — no code needed.

We can't wait to see you!
${BUSINESS_NAME}`,
  };
}

export function appointmentConfirmedEmail(vars: {
  firstName: string;
  petName: string;
  date: string;
  time: string;
}): EmailContent {
  return {
    subject: "Appointment Confirmed! 🐾",
    body: `Hi ${vars.firstName},

${vars.petName}'s appointment is officially confirmed!

Appointment Details
• Pet: ${vars.petName}
• Date: ${vars.date}
• Time: ${vars.time}

We can't wait to see you both!
${BUSINESS_NAME}`,
  };
}

export function bookingConfirmationSms(vars: {
  firstName: string;
  petName: string;
  date: string;
  time: string;
}) {
  return `Hi ${vars.firstName}! 🐾

You're all set! We've reserved a grooming appointment for ${vars.petName} on ${vars.date} at ${vars.time}.

If you need to reschedule, please let us know as soon as possible.

We can't wait to see you!
${BUSINESS_NAME}`;
}

export function bookingConfirmationEmail(vars: {
  firstName: string;
  petName: string;
  date: string;
  time: string;
}): EmailContent {
  return {
    subject: "You're Booked! 🐾",
    body: `Hi ${vars.firstName},

Your appointment is confirmed!

Appointment Details
• Pet: ${vars.petName}
• Date: ${vars.date}
• Time: ${vars.time}
• Address: ${BUSINESS_ADDRESS}

Please arrive on time and make sure your pup has had a potty break before coming in.

If you need to make any changes, simply reply to this email or contact us.

We look forward to seeing you and ${vars.petName}!
${BUSINESS_NAME}`,
  };
}

// Sent when an admin books an appointment on a customer's behalf (e.g. a
// phone booking) and wants to collect payment online instead of in person.
export function paymentLinkEmail(vars: {
  firstName: string;
  petName: string;
  date: string;
  time: string;
  price: number;
  payUrl: string;
}): EmailContent {
  return {
    subject: `Complete Payment for ${vars.petName}'s Appointment`,
    body: `Hi ${vars.firstName},

Here's your payment link for ${vars.petName}'s upcoming appointment.

Appointment Details
• Pet: ${vars.petName}
• Date: ${vars.date}
• Time: ${vars.time}
• Total: $${vars.price}

[Pay now](${vars.payUrl})

If you have any questions, just reply to this email.

${BUSINESS_NAME}`,
  };
}

// Sent to the admin when a customer reaches Stripe Checkout for a booking
// but never completes payment — either by explicitly backing out, or by
// abandoning the tab until the checkout session expires.
export function checkoutAbandonedEmail(vars: {
  customerName: string;
  customerPhone: string;
  petName: string;
  service: string;
  date: string;
  time: string;
  price: number;
}): EmailContent {
  return {
    subject: `Abandoned Checkout: ${vars.petName} on ${vars.date} at ${vars.time}`,
    body: `A customer started booking but didn't complete payment, so the appointment slot was released.

• Customer: ${vars.customerName}${vars.customerPhone ? ` (${vars.customerPhone})` : ""}
• Pet: ${vars.petName}
• Service: ${vars.service}
• Date: ${vars.date}
• Time: ${vars.time}
• Price: $${vars.price}

You may want to follow up if this looks like a customer you'd expect to hear from.

${BUSINESS_NAME} site`,
  };
}

// Sent to the admin when a customer creates an account but still hasn't
// booked an appointment after a day — a nudge to reach out, since the
// account itself generates no other signal that they dropped off.
export function signupNoBookingEmail(vars: {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  signedUpAt: string;
}): EmailContent {
  return {
    subject: `Signed Up, No Booking Yet: ${vars.customerName}`,
    body: `${vars.customerName} created an account on ${vars.signedUpAt} but hasn't booked an appointment yet.

• Name: ${vars.customerName}
• Phone: ${vars.customerPhone || "not provided"}
• Email: ${vars.customerEmail || "not provided"}

You may want to follow up.

${BUSINESS_NAME} site`,
  };
}

export function adminNewBookingEmail(vars: {
  customerName: string;
  customerPhone: string;
  petName: string;
  service: string;
  date: string;
  time: string;
  price: number;
  manageUrl: string;
}): EmailContent {
  return {
    subject: `New Booking: ${vars.petName} on ${vars.date} at ${vars.time}`,
    body: `You've got a new appointment!

• Customer: ${vars.customerName}${vars.customerPhone ? ` (${vars.customerPhone})` : ""}
• Pet: ${vars.petName}
• Service: ${vars.service}
• Date: ${vars.date}
• Time: ${vars.time}
• Price: $${vars.price}

[View here](${vars.manageUrl})

${BUSINESS_NAME} site`,
  };
}

export function tipReceivedEmail(vars: {
  customerName: string;
  petName: string;
  amount: string;
}): EmailContent {
  return {
    subject: `💰 New Tip: $${vars.amount} for ${vars.petName}`,
    body: `Nice! A tip just came through.

• Customer: ${vars.customerName}
• Pet: ${vars.petName}
• Amount: $${vars.amount}

${BUSINESS_NAME} site`,
  };
}

export function firstTimeWelcomeSms(vars: { firstName: string; petName: string }) {
  return `Welcome to ${BUSINESS_NAME}, ${vars.firstName}! 🐾

Thanks for booking ${vars.petName}'s first appointment with us!

As a welcome gift, you'll receive ONE FREE add-on during your first visit. Choose from:
🦷 Teeth Brushing
✨ Nail Grinding
🫧 Premium Shampoo Upgrade
🌿 Premium Conditioner Upgrade

Just let us know your choice when you arrive. We can't wait to meet you both!`;
}

export function firstTimeWelcomeEmail(vars: {
  firstName: string;
  petName: string;
}): EmailContent {
  return {
    subject: "Welcome! Enjoy a Free First-Visit Upgrade 🎉",
    body: `Hi ${vars.firstName},

Thank you for booking with ${BUSINESS_NAME}! We're so excited to meet you and ${vars.petName}.

As a welcome gift, you'll receive ONE FREE add-on during your first grooming appointment!

Choose one:
• Teeth Brushing
• Nail Grinding
• Premium Shampoo Upgrade
• Premium Conditioner Upgrade

Just let us know which you'd like when you arrive.

See you soon!
${BUSINESS_NAME}`,
  };
}

export function newClientVaccineReminderSms(vars: {
  firstName: string;
  petName: string;
}) {
  return `Hi ${vars.firstName}! 🐾

We're so excited to meet ${vars.petName} for their first grooming appointment with us!

Just a quick reminder: before their appointment, please send us proof of current rabies vaccination. This helps us keep all of our furry guests safe and happy. 💛

You can reply to this text with a photo of the vaccination record or email it to us at ${BUSINESS_EMAIL}.

We can't wait to meet you both!
${BUSINESS_NAME}`;
}

export function reminder24hSms(vars: {
  firstName: string;
  petName: string;
  time: string;
}) {
  return `Hi ${vars.firstName}! 🐾

Just a reminder that ${vars.petName} has a grooming appointment tomorrow at ${vars.time}.

We can't wait to see you! If you need to make any changes, please let us know as soon as possible.
${BUSINESS_NAME}`;
}

export function pickup15MinSms(vars: {
  firstName: string;
  petName: string;
  reviewUrl: string;
}) {
  return `Hi ${vars.firstName}! 🐾

We're putting the finishing touches on ${vars.petName} and they should be ready for pickup in about 15 minutes!

Please head our way when you can. We'll let you know if anything changes.

While you wait, feel free to leave a review or add a tip for your groomer: ${vars.reviewUrl}

See you soon!
${BUSINESS_NAME}`;
}

export function pickupReadySms(vars: { firstName: string; petName: string }) {
  return `Hi ${vars.firstName}! 🐶✨

${vars.petName} is all finished and ready to head home!

Please pick up within 30 minutes, if possible. If you're running behind, just let us know.

We can't wait for you to see their fresh new look!`;
}

export function mobilePickupOnWaySms(vars: {
  firstName: string;
  petName: string;
  eta: string;
}) {
  return `Hi ${vars.firstName}! 🚗🐾

I'm on my way to pick up ${vars.petName} and should arrive in about ${vars.eta}.

Please have them ready with their leash or harness.

See you soon!
${BUSINESS_NAME}`;
}

export function mobilePickupArrivedSms(vars: { petName: string }) {
  return `Hi! 🐾

I've arrived to pick up ${vars.petName}.

Whenever you're ready, please bring them out, or let me know if you'd like me to come to the door.
${BUSINESS_NAME}`;
}

export function cantReachClientSms(vars: {
  firstName: string;
  petName: string;
  waitMinutes: string;
}) {
  return `Hi ${vars.firstName},

I've arrived to pick up ${vars.petName}, but I haven't been able to reach you.

Please reply or give me a call when you're available. I'll wait ${vars.waitMinutes} minutes before moving on to my next appointment.

Thank you!
${BUSINESS_NAME}`;
}

export function mobileDropoffOnWaySms(vars: { petName: string; eta: string }) {
  return `Hi! 🏡🐾

${vars.petName} is all fresh and clean, and we're on our way home!

Our estimated arrival time is ${vars.eta}.

Please make sure someone is available to receive them.

See you soon!
${BUSINESS_NAME}`;
}

// Email versions of the "Quick Message" buttons on an appointment — used
// in place of SMS, since text messaging (Twilio) was never set up.
export function pickup15MinEmail(vars: {
  firstName: string;
  petName: string;
}): EmailContent {
  return {
    subject: "15 Minutes Until Pickup! 🐾",
    body: `Hi ${vars.firstName},

We're putting the finishing touches on ${vars.petName} and they should be ready for pickup in about 15 minutes!

Please head our way when you can. We'll let you know if anything changes.

See you soon!
${BUSINESS_NAME}`,
  };
}

export function pickupReadyEmail(vars: {
  firstName: string;
  petName: string;
}): EmailContent {
  return {
    subject: "Ready for Pickup! 🐶✨",
    body: `Hi ${vars.firstName},

${vars.petName} is all finished and ready to head home!

Please pick up within 30 minutes, if possible. If you're running behind, just let us know.

We can't wait for you to see their fresh new look!
${BUSINESS_NAME}`,
  };
}

export function mobilePickupOnWayEmail(vars: {
  firstName: string;
  petName: string;
  eta: string;
}): EmailContent {
  return {
    subject: "On My Way! 🚗🐾",
    body: `Hi ${vars.firstName},

I'm on my way to pick up ${vars.petName} and should arrive in about ${vars.eta}.

Please have them ready with their leash or harness.

See you soon!
${BUSINESS_NAME}`,
  };
}

export function mobilePickupArrivedEmail(vars: {
  firstName: string;
  petName: string;
}): EmailContent {
  return {
    subject: "I've Arrived! 🐾",
    body: `Hi ${vars.firstName},

I've arrived to pick up ${vars.petName}.

Whenever you're ready, please bring them out, or let me know if you'd like me to come to the door.

${BUSINESS_NAME}`,
  };
}

export function cantReachClientEmail(vars: {
  firstName: string;
  petName: string;
  waitMinutes: string;
}): EmailContent {
  return {
    subject: "Having Trouble Reaching You",
    body: `Hi ${vars.firstName},

I've arrived to pick up ${vars.petName}, but I haven't been able to reach you.

Please reply or give me a call when you're available. I'll wait ${vars.waitMinutes} minutes before moving on to my next appointment.

Thank you!
${BUSINESS_NAME}`,
  };
}

export function mobileDropoffOnWayEmail(vars: {
  firstName: string;
  petName: string;
  eta: string;
}): EmailContent {
  return {
    subject: "Heading Your Way! 🏡🐾",
    body: `Hi ${vars.firstName},

${vars.petName} is all fresh and clean, and we're on our way home!

Our estimated arrival time is ${vars.eta}.

Please make sure someone is available to receive them.

See you soon!
${BUSINESS_NAME}`,
  };
}

// General "please respond or we may release your slot" nudge — distinct
// from cantReachClientEmail, which is specifically for a groomer standing
// at the door for a mobile pickup. This one's for any appointment the
// admin can't get a hold of ahead of time.
export function noResponseWarningEmail(vars: {
  firstName: string;
  petName: string;
  date: string;
  time: string;
}): EmailContent {
  return {
    subject: "We Need to Hear From You",
    body: `Hi ${vars.firstName},

We've been trying to reach you about ${vars.petName}'s appointment on ${vars.date} at ${vars.time}, but haven't been able to connect.

Please reply to this email or give us a call as soon as you can. If we don't hear back, we may need to release this time slot to another customer.

Thank you!
${BUSINESS_NAME}`,
  };
}

export function postVisitThankYouSms(vars: { petName: string }) {
  return `Thank you for trusting us with ${vars.petName}! We hope you love their fresh groom. 💛
${BUSINESS_NAME}`;
}

// Sent when the admin marks an appointment complete/sent home — links to our
// own tip + review page (leave-a-review/[id]), not straight to Google, since
// it offers the tip option too.
export function postVisitThankYouEmail(vars: {
  firstName: string;
  petName: string;
  reviewUrl: string;
}): EmailContent {
  return {
    subject: `${vars.petName} is all set! 🐾`,
    body: `Hi ${vars.firstName},

${vars.petName} is all fresh, clean, and ready to head home! Thank you so much for trusting us with them today.

If you'd like to leave a review or add a tip for your groomer, you can do both here:
${vars.reviewUrl}

Thank you again — we hope to see you both soon!
${BUSINESS_NAME}`,
  };
}

// Same as postVisitThankYouEmail, minus the tip ask — for visits where the
// admin doesn't want to solicit a tip (e.g. one was already given in
// person). Still links to the same page, which is fine to also have a tip
// option on it; this email itself just doesn't mention one.
export function postVisitReviewOnlyEmail(vars: {
  firstName: string;
  petName: string;
  reviewUrl: string;
}): EmailContent {
  return {
    subject: `${vars.petName} is all set! 🐾`,
    body: `Hi ${vars.firstName},

${vars.petName} is all fresh, clean, and ready to head home! Thank you so much for trusting us with them today.

If you have a moment, we'd love to hear how it went:
${vars.reviewUrl}

Thank you again — we hope to see you both soon!
${BUSINESS_NAME}`,
  };
}

export function reviewRequestSms(vars: { firstName: string; petName: string }) {
  return `Hi ${vars.firstName}! 💛

Thank you for trusting us with ${vars.petName}.

If you loved your experience, we'd be so grateful if you could leave us a quick review. It helps our small business more than you know!

⭐ ${REVIEW_LINK}

Thank you! We hope to see you again soon!
${BUSINESS_NAME}`;
}

export function reviewRequestEmail(vars: {
  firstName: string;
  petName: string;
}): EmailContent {
  return {
    subject: "Thank You! We'd Love Your Feedback ⭐",
    body: `Hi ${vars.firstName},

Thank you for choosing ${BUSINESS_NAME}! We loved spending time with ${vars.petName}.

If you enjoyed your visit, would you mind taking a minute to leave us a review? Your support helps other pet parents discover our salon.

⭐ Leave a review here:
${REVIEW_LINK}

Thank you again! We can't wait to see you both next time!
${BUSINESS_NAME}`,
  };
}

export function vaccinationExpiringSms(vars: { firstName: string; petName: string }) {
  return `Hi ${vars.firstName}! 🩺

Our records show that ${vars.petName}'s vaccination records will expire soon.

To avoid any delays with future appointments, please send us an updated copy before your next visit.

Thank you for helping us keep every pet safe! 🐾
${BUSINESS_NAME}`;
}

export function vaccinationExpiredSms(vars: { firstName: string; petName: string }) {
  return `Hi ${vars.firstName}!

Our records show that ${vars.petName}'s vaccination records have expired.

Before we can confirm any future appointments, we'll need an updated copy from your veterinarian.

You can reply to this text or email us the records.

Thank you! 🐾
${BUSINESS_NAME}`;
}

export function rebooking8wkSms(vars: { firstName: string; petName: string }) {
  return `Hi ${vars.firstName}! 🐾

We miss seeing ${vars.petName}! It's been about 8 weeks since their last spa day.

Book your next appointment and enjoy 10% OFF your next groom!

Reply to this text or book online. We'd love to see you both again! 💛
${BUSINESS_NAME}`;
}

export function rebooking8wkEmail(vars: {
  firstName: string;
  petName: string;
}): EmailContent {
  return {
    subject: `We Miss ${vars.petName}! 🐾`,
    body: `Hi ${vars.firstName},

It's been about 8 weeks since we last saw ${vars.petName}, and we'd love to welcome them back!

To help keep them looking and feeling their best, enjoy 10% OFF your next grooming appointment when you book now.

We can't wait to see you both again!
${BUSINESS_NAME}`,
  };
}

export function rebooking16wkSms(vars: { firstName: string; petName: string }) {
  return `Hi ${vars.firstName}! 🐶

We haven't seen ${vars.petName} in a while and would love to have them back!

Enjoy 10% OFF your next grooming appointment as our way of saying, "We miss you!"

Reply to this message or book online to reserve your spot.

We hope to see you soon! 💛
${BUSINESS_NAME}`;
}
