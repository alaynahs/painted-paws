-- Free-text follow-up notes captured when a pet parent answers "yes" to the
-- behavioral, senior/special-needs, or matting check-in questions.

alter table waiver_signings
  add column behavioral_note text,
  add column senior_note text,
  add column matted_note text;
