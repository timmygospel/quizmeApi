Session Feature Overview
Purpose

A Session represents a single delivery of training to a specific group of people.

Think of it as the event where employees complete training, answer questions and generate analytics.

The session itself does not contain the training content. Instead, it references an existing Training Template.

This allows the same training to be delivered multiple times without duplicating content.

Business Goal

The Session feature exists to answer three business questions:

Who received the training?
How well did they understand the training?
Where does the organisation need to improve?

Everything else in the Session feature supports these three questions.

How Sessions Fit into the System
Training Template
        │
        ├── Sections
        │      │
        │      └── Questions
        │              │
        │              └── Answer Options
        │
        ▼
     Session
        │
        ├── Departments
        ├── Locations
        ├── Participants
        │
        ▼
    Participant Responses
        │
        ▼
     Analytics Dashboard

A Training Template defines what will be taught.

A Session defines when, where, to whom and how it will be delivered.

Why Sessions Exist

Imagine the company runs Fire Safety training every month.

Without sessions:

Fire Safety Training

With sessions:

Fire Safety Training

├── January Session
├── February Session
├── March Session
├── April Session

Each session has different:

participants
departments
locations
host
results

This allows the company to compare performance over time.

Two Types of Sessions

The platform supports two session types.

1. Live Quiz Session

Purpose:

Measure understanding during instructor-led training.

The trainer teaches a section and asks one or more questions.

Participants answer on their phones using a QR code.

The trainer immediately sees whether participants understood the topic.

Example
Host explains:

Exit Procedures

↓

Host sends Question

↓

Employees answer

↓

Results show:

42% Correct

↓

Host decides:

Continue
or

Re-teach
Primary Business Goal

Validate understanding during the training session.

2. Assessment Session

Purpose:

Measure competency after training has finished.

Participants complete a formal assessment independently.

The assessment produces a score and determines whether the participant passed or failed.

Example
15 Questions

Pass Mark = 70%

↓

Employee scores 82%

↓

PASS
Primary Business Goal

Validate competency and compliance.

Session Creation Process

Administrators create sessions using a guided five-step workflow.

Step 1 – Details

Define the training to deliver.

Fields:

Training Template
Session Name
Step 2 – Audience

Choose who should attend.

Fields:

Departments
Locations

This information is essential because analytics are compared by department and location.

Step 3 – Content

Choose which sections of the training template will be included.

Example:

✓ Fire Hazards

✓ Exit Procedures

✓ Emergency Signals

Questions are inherited automatically from the selected sections.

Administrators do not edit questions during session creation.

Step 4 – Delivery

Configure how the session will run.

For Live Quiz:

Host

For Assessment:

Pass Threshold
Multiple Attempts
Time Limit
Assessment Window

Only settings relevant to the selected session type are shown.

Step 5 – Review

Display a summary of the configuration before creating the session.

Participant Journey

Depending on the session type, participants have different experiences.

Live Quiz
Join via QR Code

↓

Wait for host

↓

Receive question

↓

Answer

↓

Repeat
Assessment
Open assessment

↓

Answer all questions

↓

Submit

↓

Receive result
What a Session Captures

Each session records:

Training Template
Included Sections
Departments
Locations
Participants
Responses
Completion status
Scores (Assessment)
Understanding (Live Quiz)

This data becomes the foundation for analytics.

Why Sessions Are Critical

The Session is the link between training content and analytics.

Without sessions, the system cannot answer:

Which department performed best?
Which location struggled?
Which sections were hardest?
Which employees need retraining?
Is performance improving over time?
Business Rules
A Session must reference one Training Template.

A session cannot exist without a training template.

A Session can include one or more Departments.

Example:

Operations

Sales
A Session can include one or more Locations.

Example:

London

Manchester
A Session inherits its Questions from the selected Sections.

Questions are never created or edited during session setup.

A Training Template can be reused across many Sessions.

Example:

Fire Safety Training

↓

January Session

↓

March Session

↓

September Session

This enables historical comparison.

Live Quiz and Assessment share the same Training Template.

Only the delivery method differs.

Developer Summary

A Session is the operational delivery of a reusable Training Template. It defines who receives the training (departments, locations and participants), how it is delivered (Live Quiz or Assessment), and captures all participant responses. Those responses are the source of all analytics shown throughout the platform, including participant performance, section understanding, question difficulty, department comparisons, location comparisons and long-term training trends.

Key Design Principle

One architectural decision you've made is particularly strong and worth preserving:

Training Templates are responsible for content (sections, questions, options).
Sessions are responsible for delivery (audience, scheduling, rules, responses).

Keeping content management and training delivery separate makes the system easier to maintain, allows the same training to be reused many times, and produces consistent analytics across different departments, locations and time periods. This separation should remain a core principle as the platform evolves.