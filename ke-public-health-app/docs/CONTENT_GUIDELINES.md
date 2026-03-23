# CONTENT_GUIDELINES.md

## Purpose

This document defines how the app should communicate public health information to users in a way that is clear, actionable, non-alarmist, and faithful to official Kenya Ministry of Health and related government sources.

## Audience

The app should support multiple audiences at the same time:

- General public users
- Community health volunteers (CHVs)
- County health teams
- Facility staff
- Program managers and response coordinators

Content should be layered so a casual user gets a simple summary first while a professional user can drill into sources, timing, and contributing factors.

## Voice and Tone

Use language that is:

- Calm
- Specific
- Practical
- Trustworthy
- Respectful

Avoid language that is:

- Alarmist
- Overconfident
- Jargon-heavy
- Diagnostic without a cited clinical source
- Vague about uncertainty

## Core Writing Rules

- State what is known, what is inferred, and what is unknown.
- Prefer plain-language summaries before technical detail.
- Lead with the most locally relevant information.
- Use short sentences and scannable sections.
- Always connect risk information to a recommended next action where appropriate.
- Attribute official guidance clearly.

## Required Labels in the UI

The interface should consistently label:

- Source
- Last updated time
- Geographic precision
- Confidence
- Official versus inferred status
- Verified versus unverified community status

## Guidance Composition Pattern

Each guidance panel should answer:

1. What is happening?
2. Who is affected?
3. What should people do now?
4. Where did this information come from?
5. How current is this information?

## Risk Summary Style

Risk summaries should:

- Use a short label such as `Elevated cholera risk`
- Include one-sentence reasoning
- Mention the evidence level
- Avoid implying certainty where data is incomplete

Example pattern:

`Elevated cholera risk in this area based on a recent official advisory and localized flooding signals. Confidence is medium because the official notice is county-level, not ward-level.`

## Local Guidance Style

Localized guidance should be:

- Action-oriented
- Behavior-specific
- Suitable for the selected geography
- Appropriate to the threat type

Preferred verbs:

- Boil
- Treat
- Wash
- Report
- Visit
- Isolate
- Vaccinate
- Monitor

Avoid generic advice when more precise official guidance exists.

## Handling Uncertainty

When data is incomplete or broad:

- Say that the information is limited
- State the reporting level clearly
- Reduce certainty in the wording
- Avoid false reassurance

Preferred examples:

- `Official alert available at county level; ward-specific details have not been published.`
- `Live outbreak updates are delayed, so this summary uses the most recent available official notice.`
- `Risk is inferred partly from environmental conditions and should be confirmed against new official updates.`

## Official vs Inferred Copy Rules

When content is official:

- Use labels such as `Official MOH advisory` or `County health notice`
- Quote only short essential excerpts if necessary
- Link to the source or source record

When content is inferred:

- Say `Inferred from supporting signals`
- Explain which supporting signals were used
- Do not present inferred content as a confirmed outbreak or directive

## Community Report Copy Rules

- Label clearly as `Community report`
- Show verification status prominently
- Avoid strong action language unless corroborated by official guidance
- Use these reports mainly for awareness and escalation cues

## Map and Alert Microcopy

Map popovers should include:

- Alert title
- Disease or threat type
- Severity or status
- Source
- Published time
- Reporting level
- Link to more detail

Timeline entries should describe the change plainly:

- `New official advisory published`
- `Outbreak status updated`
- `County vaccination campaign announced`
- `Facility service disruption reported`

## Bulletin Mode Rules

Bulletin mode should:

- Prefer text over heavy visuals
- Be readable on low bandwidth
- Summarize the selected location in a few compact sections
- Highlight urgent actions first
- Include source timestamps inline

## Accessibility and Reading Level

- Aim for plain-language readability suitable for broad public audiences.
- Avoid unexplained acronyms on first mention.
- Ensure color is not the only way to express severity.
- Support screen readers with descriptive labels for status and confidence.

## Safety Disclaimers

The app should visibly state that:

- It supports situational awareness and public health decision-making.
- It does not replace professional medical advice, emergency response, or official field directives.
- Users with urgent symptoms should seek care or contact official services.

## Localization and Translation Readiness

- Keep strings modular and translation-friendly.
- Avoid idioms that are difficult to localize.
- Support future translation into Kiswahili and other relevant languages.
- Separate reusable guidance templates from code.

## Things the Model Must Not Do

- Invent an official MOH statement
- Invent case counts or deaths
- State that a ward is affected when only county-level evidence exists
- Convert community rumors into confirmed alerts
- Use fear-based language to drive engagement

## Review Checklist

Before shipping content, confirm:

- Is the source identified?
- Is the timestamp visible?
- Is the geographic precision accurate?
- Is the certainty level honest?
- Is the next action useful?
- Does the wording avoid overclaiming?
