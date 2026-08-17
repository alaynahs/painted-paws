import { NO_SHOW_GRACE_MINUTES } from "@/lib/booking-hours";

export const BUSINESS_NAME = "Painted Paws";
export const BUSINESS_EMAIL = "booking@paintedpawsaustin.com";
export const BUSINESS_ADDRESS = "304 Lemon Light Lane, Pflugerville, TX";
export const BUSINESS_PHONE_DISPLAY = "(512) 553-9585";
export const BUSINESS_PHONE_TEL = "+15125539585";
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
  // Set when this was booked by the admin (e.g. a phone booking) and the
  // waiver wasn't filled out at booking time — links the customer to a
  // standalone page to sign it before their visit.
  waiverUrl?: string;
}): EmailContent {
  const waiverLine = vars.waiverUrl
    ? `\n\nOne last thing — please sign our grooming waiver before your visit:\n[Sign the waiver here](${vars.waiverUrl})\n`
    : "";
  return {
    subject: vars.waiverUrl
      ? "Upcoming Appointment and Waiver 🐾"
      : "You're Booked! 🐾",
    body: `Hi ${vars.firstName},

Your appointment is confirmed!

Appointment Details
• Pet: ${vars.petName}
• Date: ${vars.date}
• Time: ${vars.time}
• Address: ${BUSINESS_ADDRESS}
${waiverLine}
Please arrive on time and make sure your pup has had a potty break before coming in.

Curbside hand-off: our home workspace is a pet-only zone — no walk-ins. When you arrive, park in the driveway and send a quick text; we'll meet you at your car to bring your pet in, and do the same for pickup once the groom is complete.

Please note: if you haven't shown up ${NO_SHOW_GRACE_MINUTES} minutes past your appointment time, it will be cancelled as a no-show.

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
// Sent to the admin when cancelling an appointment with "No call, no show"
// pushes a customer to their 2nd or 3rd such cancellation — the 3rd also
// auto-blocks them from booking online (see isBlockedFromOnlineBooking).
export function noCallNoShowWarningEmail(vars: {
  customerName: string;
  customerPhone: string;
  petName: string;
  count: number;
  blocked: boolean;
}): EmailContent {
  return {
    subject: `${vars.customerName} now has ${vars.count} no-call-no-shows${vars.blocked ? " — blocked from online booking" : ""}`,
    body: `${vars.customerName}${vars.customerPhone ? ` (${vars.customerPhone})` : ""} just hit their ${vars.count === 2 ? "2nd" : "3rd"} no-call-no-show, cancelling ${vars.petName}'s appointment.

${
  vars.blocked
    ? "This is their 3rd — they've been automatically blocked from booking online. They'll need to email or call to book going forward."
    : "One more and they'll be automatically blocked from online booking."
}

${BUSINESS_NAME} site`,
  };
}

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
  advanceDiscountAmount?: number;
  advanceDiscountMinLeadWeeks?: number;
}): EmailContent {
  const promo =
    vars.advanceDiscountAmount && vars.advanceDiscountMinLeadWeeks
      ? `\n\nWhile you're here: book your next appointment at least ${vars.advanceDiscountMinLeadWeeks} weeks out and get $${vars.advanceDiscountAmount} off.`
      : "";
  return {
    subject: "15 Minutes Until Pickup! 🐾",
    body: `Hi ${vars.firstName},

We're putting the finishing touches on ${vars.petName} and they should be ready for pickup in about 15 minutes!

Please head our way when you can. We'll let you know if anything changes.${promo}

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

// Only relevant for a standard curbside visit — a pickup & drop-off
// appointment ends with the groomer driving the pet back, so there's
// nothing for the customer to go pick up.
function pickupUrgencyLine(pickupDropoff: boolean): string {
  return pickupDropoff
    ? ""
    : "\n\nIf you haven't already picked up, please do so as soon as possible — we're a kennel-free facility, so a late pickup can affect the appointments scheduled after yours.";
}

// Sent when the admin marks an appointment complete/sent home — links to our
// before/after + tip/review page (leave-a-review/[id]). Whether that page
// also asks for a tip is controlled entirely by the URL (?notip=1 or not),
// not by this email's copy, so this one function covers both cases.
export function postVisitThankYouEmail(vars: {
  firstName: string;
  petName: string;
  reviewUrl: string;
  pickupDropoff: boolean;
}): EmailContent {
  return {
    subject: `Before and After Pictures — ${vars.petName} 🐾`,
    body: `Hi ${vars.firstName},

${vars.petName} is all fresh, clean, and ready to head home!${pickupUrgencyLine(vars.pickupDropoff)}

See ${vars.petName}'s before and after pictures here:
[View before and after pictures](${vars.reviewUrl})

Thank you again — we hope to see you both soon!
${BUSINESS_NAME}`,
  };
}

// A one-off "Quick email" the admin can fire manually any time after a
// visit — separate from the automatic Mark Complete email and the 2-day
// rebooking-nudge review request, for whenever she just wants to send this
// on its own.
export function leaveReviewOrTipEmail(vars: {
  firstName: string;
  petName: string;
  reviewUrl: string;
}): EmailContent {
  return {
    subject: "Leave a Review or Tip",
    body: `Hi ${vars.firstName},

Thank you again for trusting us with ${vars.petName}! If you have a moment, we'd love it if you left a review, and you're welcome to add a tip for your groomer too — you can do both here:
[Leave a review or tip here](${vars.reviewUrl})

Thank you!
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

⭐ [Click here to leave a review](${REVIEW_LINK})

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
