import { Router } from 'itty-router';

// create router instance
const router = Router();

// --------------------
// Event Schedule
// --------------------

// GET - event schedule
router.get('/api/eventschedule', async (request, env) => {
	const schedule = await fetchSchedule(env);
	return Response.json(schedule);
});

// POST - event schedule
router.post('/api/eventschedule', async (request, env) => {
	// check for authorization
	if (!validateAuth(request, env)) {
		return new Response('Unauthorized', { status: 401 });
	}

	// data from runelite
	const scheduleBody = await request.json();

	// clear old data
	await env.sithclanplugindatabase.prepare('DELETE FROM EventMiscInfo;').run();
	await env.sithclanplugindatabase.prepare('DELETE FROM Event;').run();
	await env.sithclanplugindatabase.prepare('DELETE FROM DaySchedule;').run();

	// iterate through schedule
	for (const day of scheduleBody) {
		// insert day and get id
		const dayResult = await env.sithclanplugindatabase.prepare('INSERT INTO DaySchedule (Date) VALUES (?);').bind(day.date).run();
		const dayId = dayResult.meta.last_row_id;

		// insert event and get id
		for (const event of day.events) {
			const eventResult = await env.sithclanplugindatabase
				.prepare('INSERT INTO Event (DayId, EventTitle, EventTime, EventHost, EventLocation, EventRepeated) VALUES (?, ?, ?, ?, ?, ?);')
				.bind(dayId, event.eventTitle, event.eventTime, event.eventHost, event.eventLocation, event.eventRepeated ? 1 : 0)
				.run();
			const eventId = eventResult.meta.last_row_id;

			// insert event info
			for (const info of event.eventMiscInfo) {
				await env.sithclanplugindatabase.prepare('INSERT INTO EventMiscInfo (EventId, Info) VALUES (?, ?);').bind(eventId, info).run();
			}
		}
	}
	return new Response('Schedule posted successfully', { status: 200 });
});

// --------------------
// Member Roster
// --------------------

// GET - member roster
router.get('/api/memberroster', async (request, env) => {
	// SQL query to get roster from database
	const { results: rosterResults } = await env.sithclanplugindatabase
		.prepare(
			'SELECT MemberName, MemberRank, MemberCredits, MemberDiscordId, MemberDateJoined, MemberAltName, MemberDatePromoted ' +
				'FROM MemberRoster;',
		)
		.run();

	// query to get roster date from database
	const { results: rosterDate } = await env.sithclanplugindatabase.prepare('SELECT Date FROM RosterDate;').run();

	// building JSON response
	const roster = [];

	for (const user of rosterResults) {
		const member = {
			memberName: user.MemberName,
			memberRank: user.MemberRank,
			memberCredits: user.MemberCredits,
			memberDiscordId: user.MemberDiscordId,
			memberDateJoined: user.MemberDateJoined,
			memberAltName: user.MemberAltName,
			memberDatePromoted: user.MemberDatePromoted,
		};
		roster.push(member);
	}

	const date = rosterDate[0].Date;

	return Response.json({ date, roster });
});

// POST - member roster
router.post('/api/memberroster', async (request, env) => {
	// check for authorization
	if (!validateAuth(request, env)) {
		return new Response('Unauthorized', { status: 401 });
	}

	// data from runelite
	const body = await request.json();

	// clear old data
	await env.sithclanplugindatabase.prepare('DELETE FROM MemberRoster;').run();
	await env.sithclanplugindatabase.prepare('DELETE FROM RosterDate;').run();

	// iterate through roster
	for (const member of body) {
		// insert member
		await env.sithclanplugindatabase
			.prepare(
				'INSERT INTO MemberRoster (MemberName, MemberRank, MemberCredits, MemberDiscordId, MemberDateJoined, MemberAltName, MemberDatePromoted) VALUES (?, ?, ?, ?, ?, ?, ?);',
			)
			.bind(
				member.memberName,
				member.memberRank,
				member.memberCredits,
				member.memberDiscordId,
				member.memberDateJoined,
				member.memberAltName ?? null,
				member.memberDatePromoted ?? null,
			)
			.run();
	}

	// post roster date
	await env.sithclanplugindatabase.prepare('INSERT INTO RosterDate (Date) VALUES (?);').bind(new Date().toISOString()).run();

	return new Response('Member roster posted successfully', { status: 200 });
});

// --------------------
// Announcements
// --------------------

// GET - announcements
router.get('/api/announcements', async (request, env) => {
	const announcements = await fetchAnnouncements(env);
	return Response.json(announcements);
});

// POST - announcement
router.post('/api/announcements', async (request, env) => {
	// check for authorization
	if (!validateAuth(request, env)) {
		return new Response('Unauthorized', { status: 401 });
	}

	// data from runelite
	const body = await request.json();

	// insert announcement
	await env.sithclanplugindatabase
		.prepare('INSERT INTO Announcements (AnnouncementDate, AnnouncementText) VALUES (?, ?);')
		.bind(new Date().toISOString(), body.announcementText)
		.run();

	return new Response('Announcements posted successfully', { status: 201 });
});

// PUT - edit announcement
router.put('/api/announcements/:id', async (request, env) => {
	// check for authorization
	if (!validateAuth(request, env)) {
		return new Response('Unauthorized', { status: 401 });
	}

	// get parsed id
	const { id } = request.params;

	// error handling
	if (isNaN(id)) {
		return new Response('Invalid ID', { status: 400 });
	}

	// get announcement info
	const body = await request.json();
	if (!body.announcementText) {
		return new Response('Missing announcement text', { status: 400 });
	}

	// create and send update SQL statement
	const result = await env.sithclanplugindatabase
		.prepare('UPDATE Announcements SET AnnouncementText = ?, LastEdited = ? WHERE AnnouncementId = ?;')
		.bind(body.announcementText, new Date().toISOString(), id)
		.run();

	if (result.meta.changes === 0) {
		return new Response('Announcement not found', { status: 404 });
	}

	return new Response('Announcement updated successfully', { status: 200 });
});

// DELETE - delete announcement
router.delete('/api/announcements/:id', async (request, env) => {
	// check for authorization
	if (!validateAuth(request, env)) {
		return new Response('Unauthorized', { status: 401 });
	}

	// get parsed id
	const { id } = request.params;

	// error handling
	if (isNaN(id)) {
		return new Response('Invalid ID', { status: 400 });
	}

	// create and send delete SQL statement
	const result = await env.sithclanplugindatabase.prepare('DELETE FROM Announcements WHERE AnnouncementId = ?;').bind(id).run();

	if (result.meta.changes === 0) {
		return new Response('Announcement not found', { status: 404 });
	}

	return new Response('Announcement deleted successfully', { status: 200 });
});

// --------------------
// Startup and Validate
// --------------------

// GET - startup info
router.get('/api/startup', async (request, env) => {
	// getting all required startup info
	const [startupSchedule, startupAnnouncements] = await Promise.all([fetchSchedule(env), fetchAnnouncements(env)]);

	return Response.json({ startupSchedule, startupAnnouncements });
});

// GET - validate senate API key
router.get('/api/validate', async (request, env) => {
	if (!validateAuth(request, env)) {
		return new Response('Unauthorized', { status: 401 });
	}
	return new Response('OK', { status: 200 });
});

// any unmatched routes
router.all('*', () => new Response('Not found', { status: 404 }));

// --------------------
// Main export
// --------------------

export default {
	fetch: (request, env) => router.fetch(request, env),
};

// --------------------
// Helper functions
// --------------------

/**
 * Fetches schedule from database
 *
 * @param   {Env}      env     wrangler environment variables
 * @returns {String[]}         schedule as nested JSON array
 */
async function fetchSchedule(env) {
	// SQL query to get data from database
	const { results: scheduleResults } = await env.sithclanplugindatabase
		.prepare(
			'SELECT d.DayId, d.Date, e.EventId, e.EventTitle, e.EventTime, e.EventHost, e.EventLocation, e.EventRepeated, emi.Info ' +
				'FROM DaySchedule d ' +
				'INNER JOIN Event e ON e.DayId = d.DayId ' +
				'LEFT JOIN EventMiscInfo emi ON emi.EventId = e.EventId;',
		)
		.run();

	// building nested JSON structure
	const schedule = [];
	const dayMap = new Map();
	const eventMap = new Map();

	for (const row of scheduleResults) {
		// add day if not seen
		if (!dayMap.has(row.DayId)) {
			const day = { date: row.Date, events: [] };
			dayMap.set(row.DayId, day);
			schedule.push(day);
		}

		// add event if not seen
		if (!eventMap.has(row.EventId)) {
			const event = {
				eventTitle: row.EventTitle,
				eventTime: row.EventTime,
				eventHost: row.EventHost,
				eventLocation: row.EventLocation,
				eventRepeated: row.EventRepeated === 1,
				eventMiscInfo: [],
			};
			eventMap.set(row.EventId, event);
			dayMap.get(row.DayId).events.push(event);
		}

		// add misc info if present
		if (row.Info !== null) {
			eventMap.get(row.EventId).eventMiscInfo.push(row.Info);
		}
	}
	return schedule;
}

/**
 * Fetches clan announcements from database
 *
 * @param   {Env}      env     wrangler environment variables
 * @returns {String[]}         announcements as JSON array
 */
async function fetchAnnouncements(env) {
	// SQL query to get announcements from database
	const { results: announcementsResult } = await env.sithclanplugindatabase
		.prepare('SELECT AnnouncementId, AnnouncementText, AnnouncementDate FROM Announcements;')
		.run();

	// building JSON response
	const announcements = [];

	// iterate through announcements
	for (const row of announcementsResult) {
		const announcement = {
			announcementId: row.AnnouncementId,
			announcementDate: row.AnnouncementDate,
			announcementText: row.AnnouncementText,
		};
		announcements.push(announcement);
	}
	return announcements;
}

/**
 * Validates incoming requests for authorization
 *
 * @param   {HTTPRequest} request incoming request requiring validation
 * @param   {Env}         env     wrangler environment variables
 * @returns {boolean}             true or false if request is good or bad
 */
function validateAuth(request, env) {
	// check for authorization
	const authHeader = request.headers.get('Authorization');
	if (!authHeader || !authHeader.startsWith('Bearer ')) return false;

	// returns if auth token is correct
	return authHeader.substring(7) === env.ADMIN_API_KEY;
}
