Below is a handoff-ready implementation plan you can give to a senior Node developer to make your Socket.IO live quizzes scale to ~1,000 concurrent users on Fly.io, using Redis (Upstash or Fly Redis) for horizontal scaling + shared real-time state.

No code included—just the steps and what to configure.

Goal

Support multiple API instances (Fly Machines) handling Socket.IO connections concurrently, while ensuring:

Events broadcast reliably across instances

Room messages reach all connected clients

Join/leave presence is consistent

Active question + results are consistent even if users connect to different instances

Smooth UX (low latency, minimal reconnect issues)

Phase 0 — Decisions & Architecture
0.1 Pick Redis provider + region

Decision

Use Upstash Redis or Fly Redis.

Prefer a Redis region close to your users: London (LHR).

Acceptance

Redis endpoint reachable from Fly machines in LHR with low latency.

Credentials stored as Fly secrets (not in repo).

0.2 Define what Redis will be used for (two separate concerns)

1) Socket.IO scaling

Redis is used for the Socket.IO adapter (pub/sub) so all instances share events.

2) Live event shared state
Use Redis for fast, ephemeral state, e.g.:

Active question index

Question visibility state

Participant presence list

Per-question answer counts

Wrong answers list (or participant→answer mapping)

Last known “event snapshot” for new joiners

Mongo remains your system of record (persistence), Redis is your real-time state + cache.

Phase 1 — Fly.io Runtime Requirements
1.1 Ensure API is always on (no cold starts during live sessions)

Fly config

Set min_machines_running = 1 (or more during events)

Set auto_stop_machines = "off" during live sessions (or always, simplest)

Confirm internal_port matches your server listen port

Keep region primary_region = "lhr"

Why
Socket.IO and “live event” experiences break when machines stop and restart.

1.2 Confirm WebSocket handling is correct

Requirements

Ensure clients connect using wss://quizmeapi.fly.dev/socket.io successfully.

Prefer WebSocket transport only in production to reduce stickiness issues (see Phase 4).

Acceptance

Browser network shows 101 Switching Protocols for WS.

1.3 Run multiple machines

Fly scaling

Start by running 2 machines in LHR, then expand.

Use Fly scaling commands or configure in Fly dashboard.

Acceptance

Two machines are running simultaneously and serving requests.

Phase 2 — Redis for Socket.IO Horizontal Scaling
2.1 Add Socket.IO Redis adapter

Task

Use the official Socket.IO Redis adapter to allow broadcast across instances.

Configure the adapter with Redis connection settings.

Acceptance

Emitting an event from instance A is received by sockets connected to instance B.

2.2 Configure Redis connections correctly

Requirements

Use a dedicated Redis connection for pub/sub if recommended by the adapter.

Set sane retry/backoff behavior.

Ensure connections are reused (not created per request).

Acceptance

No connection storms on deploy/restart.

Redis connection count stays stable under load.

2.3 Store Redis credentials in Fly secrets

Task

Store Redis URL/token as secrets:

REDIS_URL (or provider-specific variables)

Acceptance

fly secrets list -a quizmeapi shows the Redis secret.

App boot logs confirm “Redis connected” once.

Phase 3 — Redis for Live Event Shared State (Critical for Correctness)

Right now, if you scale beyond 1 instance, in-memory maps like quizCache will break because each machine has its own memory.

3.1 Replace in-memory event cache with Redis-backed state

Replace

quizCache / local Map storing quiz snapshot/questions

Any “current results” stored only in memory

Store in Redis
Use key patterns like:

event:{code}:meta → name, quizId, status, adminToken hash (if needed)

event:{code}:quiz → quiz snapshot or quizId pointer

event:{code}:active → activeQuestionIndex, visible

event:{code}:participants → set/hash of participants (presence)

event:{code}:answers:{questionIndex} → hash of participantId → optionIndex

event:{code}:counts:{questionIndex} → counters per option for quick results

Acceptance

If a user joins on machine A and answers on machine B, results still update correctly.

Restarting a machine does not lose active state.

3.2 Decide what is computed vs stored

Recommendation

Store raw answers per question (participantId → optionIndex) OR just store aggregated counts depending on features:

If you need “who got it wrong”, you need raw mapping or separate wrong set.

If you only need percentages, store counts only.

Acceptance

Admin “wrong list” is correct.

Percentages are correct across many users.

3.3 Handle “new joiners see active question”

Task

On event:join, read event:{code}:active and visible

If visible, immediately push current question + current results snapshot from Redis.

Acceptance

Joining mid-question always shows the current active question + up-to-date results.

3.4 Add TTL + cleanup strategy

Task

Apply TTLs on event keys (ex: 24 hours) OR cleanup on event end:

When event ends, delete keys (or shorten TTL)

Acceptance

Redis doesn’t grow unbounded.

Old events don’t linger.

Phase 4 — Load Balancing, Stickiness, and Transport Strategy
4.1 Prefer WebSocket-only transport in production

Why
Long polling is more sensitive to lack of sticky sessions; WebSocket is best for real-time and reduces LB complexity.

Task

Configure client to connect with transports: ["websocket"]

Ensure server supports WebSocket upgrades cleanly

Acceptance

Socket connects via WS directly, not polling.

Reduced “random disconnects”.

4.2 Sticky sessions (optional, only if you keep polling)

If you allow polling fallback, you may need session affinity.

On Fly, this can be tricky/variable; WS-only usually avoids needing it.

Acceptance

No “connection flips” during polling causing missed events.

Phase 5 — Performance & Capacity Planning for 1k Concurrent Users
5.1 Define event & room strategy

Task

Ensure each live event uses a room like live:{eventCode}.

Broadcast only to that room to avoid global fanout.

Acceptance

Messages only go to relevant sockets, not everyone.

5.2 Rate limit high-frequency messages

Task

Don’t emit heavy results payloads on every single answer if unnecessary.

Consider batching results updates (e.g., every 250ms) during high load.

Acceptance

Smooth UI updates with stable CPU usage under load.

5.3 Add backpressure + guardrails

Task

Limit answer submissions per participant (one per question unless changed).

Validate payload sizes.

Reject answers when event not live or question not active.

Acceptance

No abuse can degrade performance.

Phase 6 — Observability & Reliability
6.1 Add metrics

Track:

connected sockets count

joins/minute

answers/minute

avg emit latency

Redis latency

event loop lag

memory usage

reconnect rate

Acceptance

You can see where bottlenecks occur at 500–1,000 users.

6.2 Add structured logs with correlation

Task

Include eventCode, participantId, questionIndex in logs.

Acceptance

Debugging “missing answers” or “wrong results” is straightforward.

6.3 Health checks

Task

Health endpoint checks:

Mongo connectivity (optional)

Redis connectivity (important for Socket.IO scale)

Acceptance

Machines don’t accept traffic if Redis is down.

Phase 7 — Load Testing Plan (Before You Claim 1k)
7.1 Simulate 1k users realistically

Task
Use a load tool that supports WS (k6 supports websockets; Artillery also works):

1k clients connect

join event

receive question

submit answer

receive results updates

Acceptance

<1% disconnects

acceptable response time and update latency

no machine crashes/restarts

7.2 Scale machines if needed

Task

Increase number of Fly machines (e.g., 2 → 4) if CPU becomes bottleneck.

Keep Redis in same region.

Acceptance

Latency decreases and stability improves with added machines.

Deliverables to Assign (As Jira-style tasks)

Add Redis adapter for Socket.IO (multi-instance broadcasting)

Move all live event in-memory state to Redis (quiz snapshot, active question, results)

Implement join snapshot read from Redis (new joiners see active question/results)

Add TTL/cleanup of Redis event keys

Force websocket transport in production

Fly.io runtime config for realtime (min machines, autostop off, scaling)

Metrics + logs + health check for Redis

Load test script + runbook for 1k concurrency

One key warning (important)

If any part of your live event state is still in memory (like quizCache), scaling beyond 1 machine will produce “works sometimes” bugs—wrong results, missing questions, inconsistent active question behavior.

Redis-backed state is the difference between demo-grade and enterprise-grade.
