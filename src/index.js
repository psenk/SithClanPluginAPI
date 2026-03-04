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
	async fetch(request, env) {
		const { pathname } = new URL(request.url);

		if (pathname === 'api/beverages') {
			const { results } = await env.sithclanplugindatabase
				.prepare('SELECT * FROM Customers WHERE CompanyName = ?')
				.bind('Bs Beverages')
				.run();
			return Response.json(results);
		}
		return new Response('Call /api/beverages to see everyone who works at Bs Beverages');
	},
};
