# CivicMind AI

You are an expert full-stack product engineer, UI/UX designer, database architect, and AI application architect.

BUILD A COMPLETE PRODUCTION-STYLE WEB APPLICATION CALLED:

"CivicMind AI"

Subtitle:

"Complaint-to-Action Public Issue Intelligence System"

IMPORTANT:

Do NOT create only a landing page or static UI.

Build a REAL WORKING full-stack application with:

- React

- TypeScript

- Tailwind CSS

- Supabase

- PostgreSQL

- Supabase Authentication

- Supabase Storage

- Supabase Realtime

- Supabase Edge Functions where appropriate

- Role-based access control

- Responsive PWA-ready design

The application must be architected so that a separate Python/FastAPI AI backend can later be connected through REST APIs.

Do NOT attempt to fake AI functionality.

Where a Python AI service is required, create clean API interfaces and fallback/demo behavior only where explicitly necessary.

==================================================

1. PRODUCT VISION

==================================================

CivicMind AI is an intelligent public grievance management platform.

Citizens can:

- Register/login

- Submit civic complaints

- Upload images

- Capture/select location

- Add GPS coordinates

- Describe the issue

- Select language

- Track complaint status

- Receive notifications

- Give feedback

- Chat with an AI civic assistant

The system should intelligently:

- Analyze complaint text

- Analyze uploaded images

- Classify the issue

- Predict priority

- Detect duplicate complaints

- Identify responsible department

- Route complaints

- Track SLA

- Maintain an audit trail

- Provide analytics

- Show issues on maps

- Support multilingual interaction

The system should feel like a modern government/civic-tech SaaS platform.

==================================================

2. UI/UX DESIGN

==================================================

Create a premium modern UI.

Design style:

- Futuristic civic-tech

- Clean

- Professional

- Trustworthy

- Modern

- Accessible

- Glassmorphism used subtly

- Blue / cyan / purple accent system

- White/light background with optional dark mode

- Rounded cards

- Soft shadows

- Modern typography

- Excellent spacing

- Responsive layouts

- Mobile-first

Do NOT make the design look like a generic admin template.

Create:

- Smooth animations

- Hover effects

- Loading skeletons

- Toast notifications

- Empty states

- Error states

- Success states

- Confirmation dialogs

- Responsive tables

- Charts

- Interactive maps

- Status badges

- Progress indicators

Use Lucide icons or another clean icon library.

==================================================

3. PUBLIC LANDING PAGE

==================================================

Create a professional landing page.

Sections:

1. Navbar

   - CivicMind AI logo

   - Home

   - How It Works

   - Features

   - About

   - Contact

   - Login

   - Register

2. Hero

   Heading:

   "Turn Civic Complaints Into Real Action"

   Description:

   "AI-powered public issue intelligence for faster reporting,

   smarter routing, transparent tracking and better civic services."

   Buttons:

   - Report an Issue

   - Explore Platform

3. How It Works

   Show:

   Login → Capture Issue → GPS Detection → Submit → AI Analysis → Department Routing → Resolution → Feedback

4. Features

   - AI Classification

   - Image Analysis

   - Duplicate Detection

   - Priority Prediction

   - Smart Routing

   - Live Tracking

   - Analytics

   - Multilingual AI

   - AI Chatbot

   - Notifications

5. Impact section

6. Dashboard preview

7. CTA

8. Footer

==================================================

4. AUTHENTICATION

==================================================

Use Supabase Authentication.

Create:

- Register

- Login

- Logout

- Forgot password

- Reset password

- Email verification

- Session persistence

- Protected routes

Roles:

CITIZEN

OFFICER

DEPARTMENT_ADMIN

SUPER_ADMIN

Create proper role-based route protection.

Users must only access pages permitted for their role.

==================================================

5. DATABASE

==================================================

Use Supabase PostgreSQL.

Create the following tables.

profiles

--------

id

user_id

full_name

email

phone

avatar_url

role

language

address

city

ward

created_at

updated_at

departments

-----------

id

name

description

category

contact_email

contact_phone

created_at

complaints

----------

id

complaint_number

citizen_id

title

description

category

subcategory

status

priority

severity_score

confidence_score

latitude

longitude

address

city

ward

landmark

language

assigned_department_id

assigned_officer_id

duplicate_of

duplicate_group_id

ai_classification

ai_priority_score

ai_priority_reason

ai_summary

sla_hours

sla_deadline

created_at

updated_at

resolved_at

closed_at

complaint_media

----------------

id

complaint_id

file_url

file_type

file_name

file_size

ai_analysis

created_at

complaint_timeline

------------------

id

complaint_id

status

message

changed_by

metadata

created_at

complaint_assignments

---------------------

id

complaint_id

department_id

officer_id

assigned_by

assigned_at

reason

complaint_duplicates

--------------------

id

complaint_id

matched_complaint_id

similarity_score

detection_method

created_at

notifications

-------------

id

user_id

complaint_id

title

message

type

is_read

created_at

feedback

--------

id

complaint_id

citizen_id

rating

comment

created_at

audit_logs

----------

id

user_id

action

entity_type

entity_id

old_value

new_value

ip_address

created_at

ai_predictions

--------------

id

complaint_id

model_name

prediction_type

input_reference

prediction

confidence

created_at

==================================================

6. DATABASE SECURITY

==================================================

Implement Supabase Row Level Security.

Citizens:

- Can see their own complaints

- Can create complaints

- Can upload their own complaint media

- Can see their own notifications

- Can provide feedback on their own complaints

Officers:

- Can see complaints assigned to them

- Can update assigned complaints

- Can update complaint status

- Can add timeline updates

Department Admin:

- Can see complaints belonging to their department

- Can assign officers

- Can monitor SLA

- Can view department analytics

Super Admin:

- Full access

Never expose service-role keys in frontend code.

==================================================

7. CITIZEN DASHBOARD

==================================================

Create a beautiful citizen dashboard.

Show:

- Total complaints

- Open complaints

- In progress

- Resolved

- Closed

Recent complaints.

Complaint status cards.

Quick action:

"+ Report New Issue"

Notifications.

Recent activity.

Mini map.

Feedback reminders.

==================================================

8. COMPLAINT SUBMISSION

==================================================

Create a multi-step complaint submission flow.

STEP 1:

Issue Details

Fields:

- Complaint title

- Description

- Category

- Subcategory

- Language

STEP 2:

Media

Allow:

- Upload image

- Multiple images

- Camera capture where supported

- Image preview

- Remove image

- Drag and drop

STEP 3:

Location

Allow:

- Browser geolocation

- Latitude

- Longitude

- Address

- City

- Ward

- Landmark

Include interactive map.

Allow manual location selection if GPS is unavailable.

STEP 4:

AI ANALYSIS

Display:

"Analyzing your complaint..."

Show:

- Category prediction

- Priority

- Confidence

- Possible duplicate

- Suggested department

STEP 5:

Review & Submit

Show complete summary.

STEP 6:

Success

Generate:

- Unique complaint number

- Submission timestamp

- Current status

- Assigned department

- Expected SLA

==================================================

9. AI IMAGE ANALYSIS

==================================================

The architecture must support a future external Python AI service.

Create API abstraction:

POST /ai/analyze-image

Request:

{

  complaint_id,

  image_url

}

Response:

{

  detected_objects,

  issue_type,

  severity,

  confidence,

  explanation

}

Example possible detected issues:

- pothole

- garbage

- broken streetlight

- water leakage

- drainage blockage

- damaged road

- illegal dumping

- traffic issue

- public infrastructure damage

IMPORTANT:

Do not claim that a real YOLO model is running unless an actual AI service is connected.

Create a clean service interface that can later connect to:

Python

FastAPI

PyTorch

TensorFlow

YOLO

OpenCV

==================================================

10. NLP CLASSIFICATION

==================================================

Create architecture for:

POST /ai/classify-complaint

Input:

- complaint description

- language

Output:

{

  category,

  subcategory,

  department,

  confidence,

  entities,

  summary

}

Support multilingual complaints.

Architecture should support:

- Hugging Face Transformers

- LLM APIs

- Google Gemini API

- OpenAI API

API keys must NEVER be exposed in frontend code.

Use Supabase Edge Functions for secure external API calls where appropriate.

==================================================

11. PRIORITY PREDICTION

==================================================

Create AI priority system.

Priority levels:

LOW

MEDIUM

HIGH

CRITICAL

Display:

- Priority

- Score

- Reason

- Confidence

Create interface:

POST /ai/predict-priority

Input:

- category

- description

- location

- severity

- historical context

Output:

{

  priority,

  score,

  reason,

  confidence

}

The future Python backend should support:

Scikit-learn

XGBoost

Pandas

NumPy

Do not falsely claim a trained model exists.

==================================================

12. DUPLICATE DETECTION

==================================================

Create duplicate detection architecture.

When a new complaint is submitted:

Compare:

- Text similarity

- Location proximity

- Category

- Image similarity where available

- Time proximity

Return:

{

  is_duplicate,

  matched_complaint_id,

  similarity_score

}

Future backend may use:

- sentence embeddings

- vector similarity

- graph-based matching

- image embeddings

If no AI backend is connected, clearly mark it as:

"AI service not connected"

Do NOT generate fake AI confidence values and present them as real.

==================================================

13. AUTOMATIC DEPARTMENT ROUTING

==================================================

Create smart routing.

Example:

Road damage

→ Public Works Department

Garbage

→ Sanitation Department

Streetlight

→ Electrical Department

Water leakage

→ Water Department

Drainage

→ Drainage Department

Traffic

→ Traffic Department

Create routing rules in database/configuration.

Architecture must allow future ML-based routing.

==================================================

14. OFFICER DASHBOARD

==================================================

Create separate officer dashboard.

Show:

- Assigned complaints

- New complaints

- High priority

- Critical issues

- SLA approaching

- Overdue complaints

- Resolved complaints

Table columns:

Complaint ID

Issue

Category

Priority

Location

Citizen

Status

SLA

Assigned Date

Actions

Actions:

- View

- Assign

- Update status

- Add note

- Resolve

==================================================

15. DEPARTMENT ADMIN DASHBOARD

==================================================

Create:

- Department KPIs

- Complaint volume

- Category distribution

- Priority distribution

- Resolution rate

- Average resolution time

- SLA compliance

- Officer performance

- Location heatmap

Charts:

- Line chart

- Bar chart

- Donut chart

- Area chart

- Heatmap

Filters:

- Date

- Category

- Ward

- Priority

- Status

==================================================

16. SUPER ADMIN DASHBOARD

==================================================

Create complete system administration dashboard.

Show:

- Total citizens

- Total officers

- Departments

- Complaints

- Open complaints

- Resolved complaints

- SLA breaches

- AI classifications

- Duplicate complaints

- System activity

Admin can:

- Manage users

- Manage departments

- Manage categories

- Manage routing rules

- View audit logs

- View system analytics

- Manage complaint statuses

==================================================

17. COMPLAINT DETAILS PAGE

==================================================

Create a highly detailed complaint page.

Show:

Header:

Complaint ID

Title

Status

Priority

Details:

Description

Category

Subcategory

Location

Ward

Department

Officer

Media gallery.

AI Analysis card:

- Classification

- Confidence

- Priority

- Duplicate detection

- Suggested department

Timeline:

Submitted

AI analyzed

Assigned

In progress

Resolved

Closed

Allow authorized users to update status.

Use Supabase Realtime so updates appear live.

==================================================

18. MAP SYSTEM

==================================================

Create interactive complaint map.

Show complaints as markers.

Marker colors should depend on priority/status.

Click marker:

Show complaint summary.

Filters:

- Category

- Priority

- Status

- Department

- Ward

- Date

Architecture should support:

Google Maps API

Use environment variable:

VITE_GOOGLE_MAPS_API_KEY

Never hardcode API keys.

If map API is unavailable, provide a clean fallback map/list view instead of breaking the application.

==================================================

19. NOTIFICATIONS

==================================================

Create notification center.

Notify citizen when:

- Complaint submitted

- AI analysis completed

- Complaint assigned

- Status changed

- Officer comment added

- Complaint resolved

- Feedback requested

Support architecture for:

- Supabase Realtime

- Firebase Cloud Messaging

- Email

- SMS/Twilio

==================================================

20. AI CHATBOT

==================================================

Create "CivicMind Assistant".

Users can ask:

- How do I report a pothole?

- Where is my complaint?

- What department handles garbage?

- How can I update my complaint?

- What does my complaint status mean?

Chatbot UI should be modern.

Create secure API abstraction.

Possible future providers:

OpenAI API

Google Gemini API

Do not expose API keys.

Create a Supabase Edge Function/API layer.

==================================================

21. MULTILINGUAL SUPPORT

==================================================

Support UI language architecture for:

English

Hindi

Design the system so additional Indian languages can be added later.

Complaint text may be submitted in multiple languages.

Store language with each complaint.

==================================================

22. VOICE INPUT

==================================================

Add voice input option to complaint description.

Use browser Web Speech API where available.

Button:

"Speak your complaint"

Transcribe speech into description field.

Show graceful fallback if browser does not support speech recognition.

==================================================

23. SEARCH

==================================================

Create global complaint search.

Search by:

Complaint ID

Title

Description

Category

Ward

Location

Citizen

Status

Add filters and sorting.

==================================================

24. AUDIT TRAIL

==================================================

Every important action must be logged.

Examples:

Complaint created

Complaint assigned

Status changed

Priority changed

Department changed

Officer assigned

Complaint resolved

Complaint closed

User role changed

Create audit log viewer for admins.

==================================================

25. FEEDBACK

==================================================

After complaint resolution:

Ask citizen:

"Was your issue resolved?"

Allow:

- 1–5 rating

- Comment

Display feedback analytics to admins.

==================================================

26. PWA

==================================================

Make the application PWA-ready.

Add:

- manifest

- service worker

- install support

- responsive mobile UI

- offline-friendly complaint draft

- retry sync architecture

If complete offline sync cannot be implemented safely, implement offline draft storage and clearly indicate pending synchronization.

==================================================

27. FILE STORAGE

==================================================

Use Supabase Storage.

Create buckets:

complaint-media

avatars

documents

Apply secure storage policies.

Users should only be able to access files they are authorized to access.

==================================================

28. REAL-TIME SYSTEM

==================================================

Use Supabase Realtime for:

- Complaint status updates

- Notifications

- Officer assignments

- Dashboard updates

Do not require page refresh for important live changes.

==================================================

29. SECURITY

==================================================

Implement:

- Supabase Auth

- RLS

- RBAC

- Input validation

- File type validation

- File size limits

- Secure API calls

- Environment variables

- No exposed secrets

- Secure database policies

- XSS-safe rendering

- Error handling

Never put:

- OpenAI API key

- Gemini API key

- Google API secret

- Supabase service role key

inside client-side source code.

==================================================

30. AI BACKEND CONTRACT

==================================================

The frontend must be ready to communicate with an external Python FastAPI service.

Create environment variable:

VITE_AI_BACKEND_URL

Example:

VITE_AI_BACKEND_URL=https://your-ai-backend.example.com

Create service modules such as:

src/services/aiService.ts

Functions:

analyzeImage()

classifyComplaint()

predictPriority()

detectDuplicate()

generateSummary()

Expected backend routes:

POST /ai/analyze-image

POST /ai/classify

POST /ai/priority

POST /ai/duplicate

POST /ai/summary

GET /health

The frontend should gracefully handle:

- backend unavailable

- timeout

- invalid response

- API error

- missing AI service

Show:

"AI service currently unavailable. Your complaint has still been saved."

==================================================

31. PYTHON BACKEND SPECIFICATION

==================================================

Do NOT try to force Python/FastAPI into Lovable's frontend runtime.

Instead, create:

/ai-backend

with a documented architecture for later implementation.

Recommended:

Python

FastAPI

Uvicorn

Pydantic

SQLAlchemy if needed

PyTorch

TensorFlow

OpenCV

YOLO

Scikit-learn

XGBoost

Hugging Face Transformers

Pandas

NumPy

Structure:

ai-backend/

  app/

    main.py

    api/

    models/

    schemas/

    services/

    ml/

    vision/

    nlp/

    duplicate_detection/

    priority/

    routing/

    utils/

  models/

  tests/

  requirements.txt

  Dockerfile

  .env.example

  README.md

If Lovable cannot create this backend directly, DO NOT pretend that it has.

Instead:

1. Complete the Lovable frontend.

2. Complete Supabase integration.

3. Document the exact FastAPI API contract.

4. Keep frontend service functions ready for connection.

==================================================

32. API INTEGRATION

==================================================

Use clean TypeScript types.

Create:

src/types/

src/services/

src/hooks/

src/lib/

Use centralized API handling.

Example:

apiClient.ts

Handle:

- authentication

- headers

- errors

- timeout

- retries where appropriate

==================================================

33. SUPABASE EDGE FUNCTIONS

==================================================

Use Edge Functions for secure operations such as:

- AI API calls

- External API calls

- Notification triggers

- Secure server-side logic

Never expose secret API keys in browser JavaScript.

==================================================

34. SEED DATA

==================================================

Create demo departments:

Public Works

Sanitation

Water Supply

Electricity

Drainage

Traffic

Parks

Municipal Administr

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://townhall-intel.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/7844d0c7-5c7b-4129-afe6-8f8d1c23605b).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
