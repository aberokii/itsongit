# Automation webhooks

Receive an event when a contact's tags or custom fields change, a contact enters or leaves a sequence, or a workflow run starts, ends or fails.

Automation events follow what your automations do to contacts: tag and custom-field writes, sequence enrollments and workflow runs.

Use them to mirror a contact's state into your CRM or to react when a run finishes, without polling.

Subscribe with `POST /v1/webhooks/settings` and the event names below ([first event](/webhooks#first-event)).

Delivery, retries and signatures are the same for every event ([how webhooks behave](/webhooks#how-it-behaves)).

## Events

| Event | Description |
| --- | --- |
| [`contact.tag_added`](#contacttag_added) | A tag was added to a contact. |
| [`contact.tag_removed`](#contacttag_removed) | A tag was removed from a contact. |
| [`contact.field_changed`](#contactfield_changed) | A contact custom field changed value. |
| [`sequence.enrolled`](#sequenceenrolled) | A contact was enrolled in a sequence. |
| [`sequence.exited`](#sequenceexited) | A contact left a sequence; `exitReason` says why. |
| [`workflow.run.started`](#workflowrunstarted) | A workflow run started. |
| [`workflow.run.completed`](#workflowruncompleted) | A workflow run ended. |
| [`workflow.run.failed`](#workflowrunfailed) | A workflow run failed. |

## How it behaves

### One event per real change

Contact events fire once per tag or field a write actually changed.

Re-adding a tag the contact already has, or writing a field's current value, fires nothing.

**Bulk operations.** Renaming or deleting a tag, or clearing a custom field, fires one event per contact it changed.

**New contacts.** Creating a contact with tags fires nothing. Only changes to an existing contact do.

`source` says who made the change:

- `api`: the API or the dashboard.
- `workflow`: an `add_tag`, `remove_tag` or `set_field` node.
- `automation`: a comment-automation link click that tags the clicker.

### Payloads carry ids, not accounts

These events carry no `account` block. `contact.id`, `sequence.id` and `workflow.id` are the keys.

Read the full record with [Get contact](/contacts/get-contact), [Get sequence](/sequences/get-sequence) or [Get workflow](/workflows/get-workflow).

An endpoint scoped to accounts still receives `sequence.*` and `workflow.run.*` for the account that sent them.

### Runs report how they ended

`workflow.run.completed` carries `execution.status: "completed"`, or `"exited"` when it ended on purpose before its last node. An exit is a handoff, or a button that switched the contact to another workflow.

`workflow.run.failed` carries `error`, naming the node that failed and why.

**Null fields.**

- `conversation` is `null` while a comment-triggered run has not sent the private reply that opens its conversation.
- `trigger.type` is `null` when the workflow was deleted while the run was live.

### Inbox access gates them

Contacts, sequences and workflows are inbox features, so these events need inbox access like the [inbox events](/webhooks/inbox#a-legacy-appsumo-plan-gates-the-inbox).

---

## `contact.tag_added`

A tag was added to a contact, by the API, a workflow `add_tag` node or a comment-automation click.

<br />

**Payload for `contact.tag_added`:**

- **test** `boolean`: Always true when present: only a sample sent by POST /v1/webhooks/test with an event carries it. Real deliveries never do.
- **id** (required) `string`: Event id, the dedupe key.
- **profiles**: `WebhookProfiles` - See schema definition
- **event** (required) `string`: No description - one of: contact.tag_added, contact.tag_removed
- **timestamp** (required) `string` (date-time): No description
- **contact** (required) `object`: 
  - **id** `string`: Zernio contact id.
- **tag** (required) `string`: No description
- **source** (required) `string`: Who wrote the tag: the API or dashboard, a workflow add_tag / remove_tag node, or a comment-automation link click. - one of: api, workflow, automation

---

## `contact.tag_removed`

A tag was removed from a contact.

<br />

**Payload for `contact.tag_removed`:**

- **test** `boolean`: Always true when present: only a sample sent by POST /v1/webhooks/test with an event carries it. Real deliveries never do.
- **id** (required) `string`: Event id, the dedupe key.
- **profiles**: `WebhookProfiles` - See schema definition
- **event** (required) `string`: No description - one of: contact.tag_added, contact.tag_removed
- **timestamp** (required) `string` (date-time): No description
- **contact** (required) `object`: 
  - **id** `string`: Zernio contact id.
- **tag** (required) `string`: No description
- **source** (required) `string`: Who wrote the tag: the API or dashboard, a workflow add_tag / remove_tag node, or a comment-automation link click. - one of: api, workflow, automation

---

## `contact.field_changed`

A contact custom field changed value. `field` is the field slug.

`previousValue` is `null` when the field was not set. `value` is `null` when it was removed.

<br />

**Payload for `contact.field_changed`:**

- **test** `boolean`: Always true when present: only a sample sent by POST /v1/webhooks/test with an event carries it. Real deliveries never do.
- **id** (required) `string`: Event id, the dedupe key.
- **profiles**: `WebhookProfiles` - See schema definition
- **event** (required) `string`: No description - one of: contact.field_changed
- **timestamp** (required) `string` (date-time): No description
- **contact** (required) `object`: 
  - **id** `string`: Zernio contact id.
- **field** (required) `string`: Custom field slug.
- **previousValue** (required): Value before the write; null when the field was not set.
- **value** (required): Value after the write; null when the field was removed.
- **source** (required) `string`: Who wrote the field: the API or dashboard, a workflow set_field node, or an automation. - one of: api, workflow, automation

---

## `sequence.enrolled`

A contact was enrolled in a sequence, through the API or a workflow `enroll_sequence` node.

<br />

**Payload for `sequence.enrolled`:**

- **test** `boolean`: Always true when present: only a sample sent by POST /v1/webhooks/test with an event carries it. Real deliveries never do.
- **id** (required) `string`: Event id, the dedupe key.
- **profiles**: `WebhookProfiles` - See schema definition
- **event** (required) `string`: No description - one of: sequence.enrolled, sequence.exited
- **timestamp** (required) `string` (date-time): No description
- **sequence** (required) `object`: 
  - **id** `string`: No description
  - **name** `string`: No description
- **contact** (required) `object`: 
  - **id** `string`: Zernio contact id.
- **enrollment** (required) `object`: 
  - **id** `string`: No description
- **exitReason** `string`: sequence.exited only. completed: the last step was sent; replied: the contact replied and the sequence exits on reply; manual: unenrolled through the API; failed: the step kept failing to send; unsubscribed: the contact opted out. - one of: completed, replied, manual, failed, unsubscribed

---

## `sequence.exited`

A contact left a sequence. `exitReason` says why:

- `completed`: the last step was sent.
- `replied`
- `manual`: unenrolled through the API.
- `failed`: the step kept failing to send.
- `unsubscribed`

<br />

**Payload for `sequence.exited`:**

- **test** `boolean`: Always true when present: only a sample sent by POST /v1/webhooks/test with an event carries it. Real deliveries never do.
- **id** (required) `string`: Event id, the dedupe key.
- **profiles**: `WebhookProfiles` - See schema definition
- **event** (required) `string`: No description - one of: sequence.enrolled, sequence.exited
- **timestamp** (required) `string` (date-time): No description
- **sequence** (required) `object`: 
  - **id** `string`: No description
  - **name** `string`: No description
- **contact** (required) `object`: 
  - **id** `string`: Zernio contact id.
- **enrollment** (required) `object`: 
  - **id** `string`: No description
- **exitReason** `string`: sequence.exited only. completed: the last step was sent; replied: the contact replied and the sequence exits on reply; manual: unenrolled through the API; failed: the step kept failing to send; unsubscribed: the contact opted out. - one of: completed, replied, manual, failed, unsubscribed

---

## `workflow.run.started`

A workflow run started. `trigger.type` is the trigger node's type.

`trigger.text` is the inbound message that started the run, when there was one.

<br />

**Payload for `workflow.run.started`:**

- **test** `boolean`: Always true when present: only a sample sent by POST /v1/webhooks/test with an event carries it. Real deliveries never do.
- **id** (required) `string`: Event id, the dedupe key.
- **profiles**: `WebhookProfiles` - See schema definition
- **event** (required) `string`: No description - one of: workflow.run.started, workflow.run.completed, workflow.run.failed
- **timestamp** (required) `string` (date-time): No description
- **workflow** (required) `object`: 
  - **id** `string`: No description
  - **name** `string,null`: Null when the workflow was deleted while the run was live.
- **execution** (required) `object`: 
  - **id** `string`: Workflow run (execution) id.
  - **status** `string`: running on workflow.run.started; completed or exited (ended on purpose before the last node, e.g. a handoff) on workflow.run.completed; failed on workflow.run.failed. - one of: running, waiting, completed, exited, failed
- **conversation** (required) `object,null`: Null while a comment-triggered run has not sent the private reply that opens its conversation.
- **contact** (required) `object,null`: No description
- **trigger** (required) `object`: 
  - **type** `string,null`: The trigger node type, e.g. inbound_message (the default when the node sets none). Null when the workflow was deleted while the run was live.
  - **text** `string`: The inbound message that started the run, when there was one.
- **error** `string`: workflow.run.failed only: which node failed and why.

---

## `workflow.run.completed`

A workflow run ended, with `execution.status` `completed` or `exited` ([why](#runs-report-how-they-ended)).

<br />

**Payload for `workflow.run.completed`:**

- **test** `boolean`: Always true when present: only a sample sent by POST /v1/webhooks/test with an event carries it. Real deliveries never do.
- **id** (required) `string`: Event id, the dedupe key.
- **profiles**: `WebhookProfiles` - See schema definition
- **event** (required) `string`: No description - one of: workflow.run.started, workflow.run.completed, workflow.run.failed
- **timestamp** (required) `string` (date-time): No description
- **workflow** (required) `object`: 
  - **id** `string`: No description
  - **name** `string,null`: Null when the workflow was deleted while the run was live.
- **execution** (required) `object`: 
  - **id** `string`: Workflow run (execution) id.
  - **status** `string`: running on workflow.run.started; completed or exited (ended on purpose before the last node, e.g. a handoff) on workflow.run.completed; failed on workflow.run.failed. - one of: running, waiting, completed, exited, failed
- **conversation** (required) `object,null`: Null while a comment-triggered run has not sent the private reply that opens its conversation.
- **contact** (required) `object,null`: No description
- **trigger** (required) `object`: 
  - **type** `string,null`: The trigger node type, e.g. inbound_message (the default when the node sets none). Null when the workflow was deleted while the run was live.
  - **text** `string`: The inbound message that started the run, when there was one.
- **error** `string`: workflow.run.failed only: which node failed and why.

---

## `workflow.run.failed`

A workflow run failed. `error` says which node failed and why.

<br />

**Payload for `workflow.run.failed`:**

- **test** `boolean`: Always true when present: only a sample sent by POST /v1/webhooks/test with an event carries it. Real deliveries never do.
- **id** (required) `string`: Event id, the dedupe key.
- **profiles**: `WebhookProfiles` - See schema definition
- **event** (required) `string`: No description - one of: workflow.run.started, workflow.run.completed, workflow.run.failed
- **timestamp** (required) `string` (date-time): No description
- **workflow** (required) `object`: 
  - **id** `string`: No description
  - **name** `string,null`: Null when the workflow was deleted while the run was live.
- **execution** (required) `object`: 
  - **id** `string`: Workflow run (execution) id.
  - **status** `string`: running on workflow.run.started; completed or exited (ended on purpose before the last node, e.g. a handoff) on workflow.run.completed; failed on workflow.run.failed. - one of: running, waiting, completed, exited, failed
- **conversation** (required) `object,null`: Null while a comment-triggered run has not sent the private reply that opens its conversation.
- **contact** (required) `object,null`: No description
- **trigger** (required) `object`: 
  - **type** `string,null`: The trigger node type, e.g. inbound_message (the default when the node sets none). Null when the workflow was deleted while the run was live.
  - **text** `string`: The inbound message that started the run, when there was one.
- **error** `string`: workflow.run.failed only: which node failed and why.

## Related

- [Webhooks](/webhooks): create an endpoint, retries, signatures.
- [Workflows](/workflows): triggers, nodes and runs.
- [Inbox webhooks](/webhooks/inbox): `message.sent` carries the `workflowId`, `executionId`, `sequenceId` and `automationId` that sent each message.
- [Contacts](/contacts/list-contacts) and [Sequences](/sequences/list-sequences): the records these events describe.