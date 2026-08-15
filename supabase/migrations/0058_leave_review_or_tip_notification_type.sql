-- New Quick Message type — a one-off "Leave a Review or Tip" email the
-- admin can send manually any time after a visit, separate from the
-- automatic Mark Complete email and the 2-day rebooking-nudge review
-- request.
alter type notification_type add value if not exists 'leave_review_or_tip';
