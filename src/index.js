// TODO: multiple announcements in the future?

export default {
	/**
	 * Handles incoming HTTP requests.
	 *
	 * @param   {Request} request incoming HTTP request
	 * @param   {Env}     env     wrangler environment variables
	 * @returns {Response}        HTTP response
	 */
	async fetch(request, env) {
		const { pathname } = new URL(request.url);

		switch (pathname) {
			// GET event schedule
			case '/api/eventschedule':
				const getSchedule = await fetchSchedule(env);

				return Response.json(getSchedule);

			// POST event schedule
			case '/api/eventschedule/post':
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
							.prepare(
								'INSERT INTO Event (DayId, EventTitle, EventTime, EventHost, EventLocation, EventRepeated) VALUES (?, ?, ?, ?, ?, ?);',
							)
							.bind(dayId, event.eventTitle, event.eventTime, event.eventHost, event.eventLocation, event.eventRepeated ? 1 : 0)
							.run();
						const eventId = eventResult.meta.last_row_id;

						// insert event info
						for (const info of event.eventMiscInfo) {
							await env.sithclanplugindatabase
								.prepare('INSERT INTO EventMiscInfo (EventId, Info) VALUES (?, ?);')
								.bind(eventId, info)
								.run();
						}
					}
				}
				return new Response('Schedule posted successfully', { status: 200 });

			// GET member roster
			case '/api/memberroster':
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

			// POST member roster
			case '/api/memberroster/post':
				// check for authorization
				if (!validateAuth(request, env)) {
					return new Response('Unauthorized', { status: 401 });
				}

				// data from runelite
				const rosterBody = await request.json();

				// clear old data
				await env.sithclanplugindatabase.prepare('DELETE FROM MemberRoster;').run();
				await env.sithclanplugindatabase.prepare('DELETE FROM RosterDate;').run();

				// iterate through roster
				for (const member of rosterBody) {
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

			// GET announcements
			case '/api/announcements':
				const getAnnouncements = await fetchAnnouncements(env);

				return Response.json(getAnnouncements);

			// POST announcements
			case '/api/announcements/post':
				// check for authorization
				if (!validateAuth(request, env)) {
					return new Response('Unauthorized', { status: 401 });
				}

				// data from runelite
				const announcementBody = await request.json();

				// clear old data
				await env.sithclanplugindatabase.prepare('DELETE FROM Announcements;').run();

				// iterate through announcements
				for (const announcement of announcementBody) {
					// insert announcement
					await env.sithclanplugindatabase
						.prepare('INSERT INTO Announcements (AnnouncementDate, AnnouncementText) VALUES (?, ?);')
						.bind(new Date().toISOString(), announcement.announcementText)
						.run();
				}

				return new Response('Announcements posted successfully', { status: 200 });

			// GET startup info
			case '/api/startup':
				// getting all required startup info
				const [startupSchedule, startupAnnouncements] = await Promise.all([fetchSchedule(env), fetchAnnouncements(env)]);

				return Response.json({ startupSchedule, startupAnnouncements });

			// validate API key
			case '/api/validate':
				if (!validateAuth(request, env)) {
					return new Response('Unauthorized', { status: 401 });
				}
				return new Response('OK', { status: 200 });

			default:
				return new Response('Not found', { status: 404 });
		}
	},
};

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
		.prepare('SELECT AnnouncementText, AnnouncementDate FROM Announcements;')
		.run();

	// building JSON response
	const announcements = [];

	// iterate through announcements
	for (const row of announcementsResult) {
		const announcement = { announcementDate: row.AnnouncementDate, announcementText: row.AnnouncementText };
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
