import HTML from './index.html';

export interface Env {
	AI: Ai;
}

export default {
	async fetch(request, env): Promise<Response> {
		if (request.method === 'GET') {
			return new Response(HTML, { headers: { 'Content-Type': 'text/html' } });
		}

		if (request.method !== 'POST') {
			return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
		}

		const username = request.url.split('/').pop() || '';

		const headers = {
			'Content-Type': 'application/json',
			'User-Agent': 'github-roaster/1.0;',
		}

		const _profile = await fetch(`https://api.github.com/users/${username}`, {
			headers: headers
		});

		if (!_profile.ok) {
			return new Response(JSON.stringify({ error: 'Profile not found' }), { status: 404 });
		}

		const profile: any = await _profile.json();

		const repos: any[] = await (await fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=10`, { headers: headers })).json();

		let readme = '';
		try {
			const _readme = await fetch(`https://raw.githubusercontent.com/${username}/${username}/main/README.md`, { headers: headers });
			if (_readme.ok) {
				readme = await _readme.text();
			}
		} catch { }

		const data = {
			name: profile.name,
			bio: profile.bio,
			company: profile.company,
			location: profile.location,
			followers: profile.followers,
			following: profile.following,
			public_repos: profile.public_repos,
			created_at: profile.created_at,
			repos: repos.map((repo) => ({
				name: repo.name,
				description: repo.description,
				language: repo.language,
				updated_at: repo.updated_at,
				stargazers_count: repo.stargazers_count,
				fork: repo.fork,
				open_issues_count: repo.open_issues_count,
			})),
			readme: readme,
		}

		const prompt = `give a short and harsh roasting for the following github profile: ${username}. Do it in 3 paragraphs of each 150 words, separated by a blank line. Here are the details: ${JSON.stringify(data)}`

		let response: any;

		try {
			response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
				messages: [
					{ role: "system", content: "You roast people github account based on their bio, name, readme, and repos as harsh and spicy as possible, and directly start without any other text or description." },
					{ role: "user", content: prompt },
				],
				max_tokens: 500
			});
		} catch (e) {
			response = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
				messages: [
					{ role: "system", content: "You roast people github account based on their bio, name, readme, and repos as harsh and spicy as possible, and directly start without any other text or description." },
					{ role: "user", content: prompt },
				],
				max_tokens: 500
			});
		}

		response = response.response;
		response = response.replaceAll('\n', '<br>').replaceAll('<br><br>', '<br>');

		console.log('response', response);
		

		return new Response(JSON.stringify({
			succes: true,
			roast: response
		}));
	},
} satisfies ExportedHandler<Env>;