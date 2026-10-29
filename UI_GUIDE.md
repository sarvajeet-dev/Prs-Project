# UI Guide - Visual Walkthrough

## Before vs After

### BEFORE (Old Version)
```
┌─────────────────────────────────────────────────────┐
│ [Explore badges]                            Fit Score │
│                                                   75   │
│ Organization Name                                     │
│ Announcement Title                                    │
│ Description                                           │
│ Source · Date                                         │
│                                                       │
│ Why this is relevant                                 │
│ • Bullet point 1                                     │
│ • Bullet point 2                                     │
│                                                       │
│ [View PR]                                            │
└─────────────────────────────────────────────────────┘

❌ No contact information
❌ No email generation
❌ Manual outreach required
```

### AFTER (New Version)
```
┌─────────────────────────────────────────────────────┐
│ [Badges]                                   Fit Score │
│                                                   75   │
│ Organization Name                                     │
│ Announcement Title                                    │
│ Description                                           │
│ Source · Date                                         │
│                                                       │
│ Why this is relevant                                 │
│ • Bullet point 1                                     │
│ • Bullet point 2                                     │
│                                                       │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Contact                                          │ │ ← NEW
│ │                                                  │ │
│ │ John Smith                                       │ │ ← Contact Name
│ │ VP Operations                                    │ │ ← Title
│ │                                                  │ │
│ │ john.smith@org.com (65% confidence)             │ │ ← Email + Score
│ └─────────────────────────────────────────────────┘ │
│                                                       │
│ [View PR] [Generate Email] ← NEW BUTTON             │
└─────────────────────────────────────────────────────┘

✅ Contact display with confidence
✅ Email generation button
✅ One-click outreach
```

---

## Main Page Components

### 1. Header Section
```
┌─────────────────────────────────────────────────────────────┐
│                    PR Prospecting                            │
│ Health 2.0 & Education 2.0 opportunity discovery            │
│                             [Discover New PRs] ← Updated text│
└─────────────────────────────────────────────────────────────┘

Old: "Searching Tavily..."
New: "Searching free sources..."
```

### 2. Statistics Dashboard
```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Total        │ │ Healthcare   │ │ Education    │ │ High Fit     │
│ 47           │ │ 28           │ │ 19           │ │ 32           │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

### 3. Filter Bar
```
┌──────────────┬──────────────┬──────────────┬────────────────┐
│ All Markets  │ All Categories│ All Signals │ Search...      │
└──────────────┴──────────────┴──────────────┴────────────────┘

Options:
- Markets: Singapore, Malaysia, Hong Kong
- Categories: Healthcare, Education
- Signals: Funding, Launch, Expansion, Partnership, Leadership, Research
- Search: Free text on org name + announcement
```

---

## Prospect Card - Detailed Breakdown

### Card Layout (Top Section)
```
┌───────────────────────────────────────────────────────┐
│ [Education] [Singapore] [Expansion] [Partnership]   75│
│                                                        │
│ Study Group expands into Singapore with two new       │
│ education partnerships                                │
│                                                        │
│ Study Group expands into Singapore with two new       │
│ education partnerships - StudyTravel Network          │
│                                                        │
│ Source: news.google.com · 9/23/2025                  │
└───────────────────────────────────────────────────────┘
```

**Elements:**
- **Badges**: Category + Market + Signals (color-coded)
- **Fit Score**: Right corner (0-100)
- **Title**: Organization name (bold, large)
- **Headline**: Announcement title (bold, size-16)
- **Description**: Full announcement excerpt
- **Meta**: Source domain + Publication date

### Card Layout (Middle Section)
```
┌───────────────────────────────────────────────────────┐
│ Why this is relevant                                  │
│ • Strong education relevance                          │
│ • Business signals: expansion, partnership, research  │
│ • Publication date available                          │
└───────────────────────────────────────────────────────┘
```

**Elements:**
- **Section Header**: "Why this is relevant"
- **Reasons**: 2-3 bullet points explaining fit score
- **Updated**: Dynamically generated based on signals

### Card Layout (New: Contact Section) ← NEW
```
┌───────────────────────────────────────────────────────┐
│ Contact                                               │
│                                                       │
│ John Smith                                    ← Name  │
│ VP Operations                                 ← Title │
│                                                       │
│ john.smith@studygroup.com (65% confidence)  ← Email  │
│                                              & Score  │
└───────────────────────────────────────────────────────┘
```

**Elements:**
- **Section Header**: "Contact"
- **Name**: Full name (bold)
- **Title**: Job title (gray, smaller)
- **Email**: Email address (blue, clickable)
- **Confidence**: Score in parentheses (gray, small)

**Styling:**
- Background: Light gray (#f9f9f9)
- Padding: 12px
- Border radius: 6px
- Font size: 13px base, smaller for metadata

### Card Layout (Bottom Section)
```
┌───────────────────────────────────────────────────────┐
│ [View PR] [Generate Email] ← BUTTONS                 │
└───────────────────────────────────────────────────────┘
```

**Elements:**
- **View PR**: Black button, links to announcement
- **Generate Email**: Blue button (new), opens email modal
- **Layout**: Flex, wrap, gap 10px

---

## Email Generation Modal - Detailed View

### Modal Structure
```
┌─────────────────────────────────────────────────────────┐
│ Generate Email Draft                              ✕   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ To: John Smith                                          │
│ Title: VP Operations                                    │
│ Organization: Study Group                              │
│ Announcement: Study Group expands into Singapore...    │
│                                                         │
│ Signals Detected: [Expansion] [Partnership] [Research]│
│                                                         │
│ [Generate Personalized Email] (loading state shown)   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Modal Before Generation
```
┌─────────────────────────────────────────────────────────┐
│ Generate Email Draft                              ✕   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ To:                                                     │
│ ┌─────────────────────────────────────────────────────┐│
│ │ John Smith                                          ││
│ │ VP Operations                                       ││
│ │                                                     ││
│ │ john.smith@studygroup.com                          ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ Organization:                                           │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Study Group                                         ││
│ │ Study Group expands into Singapore with two new...  ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ Signals Detected:                                       │
│ [Expansion] [Partnership] [Research]                  │
│                                                         │
│ [Generate Personalized Email - button]                │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Modal After Generation
```
┌─────────────────────────────────────────────────────────┐
│ Generate Email Draft                              ✕   │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ Outreach Angle:                                         │
│ ┌─────────────────────────────────────────────────────┐│
│ │ Study Group is an excellent fit for Education 2.0 ││
│ │ because they're actively expanding into new markets││
│ │ and geographies like Singapore.                    ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ Email Draft:                                            │
│ ┌─────────────────────────────────────────────────────┐│
│ │ To: John Smith                                      ││
│ │ Subject: Growth opportunity for innovators -       ││
│ │          Study Group @ Education 2.0               ││
│ │                                                     ││
│ │ Hi John,                                            ││
│ │                                                     ││
│ │ I came across Study Group's recent announcement  ││
│ │ about expanding into Singapore with two new      ││
│ │ education partnerships, and I think you'd be a  ││
│ │ great fit for Education 2.0.                     ││
│ │                                                     ││
│ │ We're bringing together the leading innovators   ││
│ │ in education tech, and based on your work with   ││
│ │ expansion into new markets, I think Study Group  ││
│ │ would be a valuable addition to the community.   ││
│ │                                                     ││
│ │ Why we think this is a great fit:                 ││
│ │ • Strong education relevance                      ││
│ │ • Business signals: expansion, partnership,      ││
│ │   research                                         ││
│ │                                                     ││
│ │ Education 2.0 2025 brings together:               ││
│ │ • Top-tier organizations (schools, universities, ││
│ │   edtech platforms)                               ││
│ │ • 500+ attendees from across the region           ││
│ │ • Speaking opportunities & sponsorship options    ││
│ │ • Networking with key decision-makers             ││
│ │                                                     ││
│ │ Would you be open to a quick call to discuss how ││
│ │ Study Group could participate?                    ││
│ │                                                     ││
│ │ Best regards,                                      ││
│ │ PR Team                                            ││
│ │ Education 2.0                                      ││
│ │ https://www.education2conf.com                    ││
│ └─────────────────────────────────────────────────────┘│
│                                                         │
│ [Copy Email] [Send Email]                             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## Color Scheme

### Badges (Signal Types)
```
[Education]        → Light blue background
[Healthcare]       → Light pink background
[Singapore]        → Light green background
[Funding]          → Light yellow background
[Expansion]        → Light orange background
[Partnership]      → Light purple background
[Research]         → Light cyan background
```

### Buttons
```
[View PR]          → Black (#111) on white
[Generate Email]   → Blue (#0066cc) on white
[Copy Email]       → Blue (#0066cc) on white
[Send Email]       → Green (#28a745) on white
```

### Text
```
Organization name  → Bold, size 16-18
Announcement       → Bold, size 16
Description        → Regular, size 14, gray (#555)
Source/Date        → Small, gray (#777)
Contact name       → Bold, size 14
Contact title      → Regular, gray (#666)
Email              → Blue (#0066cc), clickable
Confidence %       → Small, gray (#999)
```

---

## Responsive Design

### Desktop (1400px)
```
┌──────────────────────────────────────────────────┐
│ Prospect Card (full width)                       │
│                                                  │
│ [Badge] [Badge] [Badge]             Fit Score   │
│ Title                                    75      │
│ Description...                                   │
│                                                  │
│ Contact                                          │
│ Name, Title, Email                              │
│                                                  │
│ [View PR] [Generate Email]                      │
└──────────────────────────────────────────────────┘
```

### Tablet (768px)
```
┌────────────────────────────┐
│ Prospect Card              │
│ (responsive width)         │
│                            │
│ [Badges]      Fit Score   │
│ Title              75      │
│ Description...            │
│                            │
│ Contact                    │
│ Name, Title, Email        │
│                            │
│ [View] [Generate] (wrap)  │
└────────────────────────────┘
```

### Mobile (375px)
```
┌──────────────┐
│ [Badges]   75│
│ Title        │
│ Description  │
│              │
│ Contact      │
│ Name         │
│ Title        │
│ Email        │
│              │
│ [View]       │
│ [Generate]   │
└──────────────┘
```

---

## User Interactions

### 1. Discover Flow
```
User clicks "Discover New PRs"
          ↓
Button shows "Searching free sources..."
          ↓
System queries 3 APIs in parallel
          ↓
Results load after 30-60 seconds
          ↓
Button returns to "Discover New PRs"
          ↓
Prospect cards display
```

### 2. Filter Flow
```
User selects market filter
          ↓
Results re-filter instantly (cached)
          ↓
Page resets to 1
          ↓
Stats update (Total, Healthcare, Education, High Fit)
```

### 3. Email Generation Flow
```
User clicks "Generate Email" button
          ↓
Modal appears with prospect info
          ↓
User reviews contact and organization
          ↓
User clicks "Generate Personalized Email"
          ↓
Button shows "Generating..."
          ↓
Email modal updates with preview
          ↓
User can "Copy Email" or "Send Email"
          ↓
Modal closes on background click or ✕ button
```

### 4. Email Copy/Send Flow
```
User clicks "Copy Email"
          ↓
Full email copied to clipboard
          ↓
Button shows "Copied!" for 2 seconds
          ↓
User can paste in Gmail/Outlook/etc
              OR
User clicks "Send Email"
          ↓
Opens mailto: link in default email client
          ↓
Email pre-populated with subject + body
```

---

## Accessibility Features

### Keyboard Navigation
- ✅ Tab through filters
- ✅ Tab through buttons
- ✅ Enter to trigger actions
- ✅ Escape to close modal

### Screen Readers
- ✅ Semantic HTML (buttons, headings)
- ✅ Alt text on badges
- ✅ ARIA labels on modals
- ✅ Role attributes on interactive elements

### Color Contrast
- ✅ Text on backgrounds: 4.5:1 ratio
- ✅ Badges distinguishable by color + text
- ✅ Links underlined and colored

---

## Animation & Feedback

### Loading States
```
[Discover New PRs] (normal)
          ↓
[Searching free sources...] (loading)
          ↓
[Discover New PRs] (done)
```

### Copy Confirmation
```
[Copy Email] (normal)
          ↓
[Copied to clipboard!] (success)
          ↓
[Copy Email] (after 2s)
```

### Button States
```
Normal    → Full opacity, pointer cursor
Hover     → Slightly darker background
Active    → Pressed appearance
Disabled  → 0.7 opacity, not-allowed cursor
Loading   → Disabled + text change
```

---

## Summary

The UI now provides a **complete end-to-end workflow**:

1. **Discover** → See prospects with signals and fit scores
2. **Identify** → View contact information with confidence
3. **Generate** → Create personalized emails in seconds
4. **Send** → Copy or send directly to email client

**Every action is instant, intuitive, and professional.**
