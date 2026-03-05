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

		switch (pathname) {
			case '/api/testschedule':
				const { results } = await env.sithclanplugindatabase.prepare('SELECT * FROM TestEventSchedule WHERE EventId = 1;').run();

				const parsedSchedule = results.map((row) => ({
					...row,
					EventSchedule: JSON.parse(row.EventSchedule),
				}));
				return Response.json(parsedSchedule);

			case '/api/eventschedule':
				// TODO: implement functionality
				return new Response('TBD');

			default:
				return new Response('Not found', { status: 404 });
		}
	},
};
