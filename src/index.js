/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export default {
	/**
	 * Handles incoming HTTP requests.
	 *
	 * @param   {Request} request incoming HTTP request
	 * @param   {Env}     env     wrangler worker bindings and environment variables
	 * @returns {Response}        HTTP response
	 */
	async fetch(request, env) {
		const { pathname } = new URL(request.url);
		console.log('pathname: ', pathname);

		switch (pathname) {
			// GET event schedule
			case '/api/eventschedule':
				// SQL query to get data from database
				const { results } = await env.sithclanplugindatabase
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

				for (const row of results) {
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

				return Response.json(schedule);

			// POST event schedule
			case '/api/eventschedule/post':
				// TODO: API key check/misc security
				// TODO: input sanitization
				// JSON data from runelite
				const body = await request.json();

				// clear old data
				await env.sithclanplugindatabase.prepare('DELETE FROM EventMiscInfo;').run();
				await env.sithclanplugindatabase.prepare('DELETE FROM Event;').run();
				await env.sithclanplugindatabase.prepare('DELETE FROM DaySchedule;').run();

				for (const day of body) {
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

			default:
				return new Response('Not found', { status: 404 });
		}
	},
};
