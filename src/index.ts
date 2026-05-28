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

		const username = request.url.split('/').pop().trim() || '';

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

		// Prefer non-forks over forks, limit to 5 repos
		const nonForks = repos.filter(repo => !repo.fork);
		const forks = repos.filter(repo => repo.fork);

		const selectedRepos = [
			...nonForks.slice(0, 5),
			...forks.slice(0, Math.max(0, 5 - nonForks.length))
		].slice(0, 5);

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
			repos: selectedRepos.map((repo) => ({
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

		const prompt = `You are a merciless GitHub account roaster. Your job is to deliver the harshest, most creative roast imaginable for the following profile: @${username}. 
Go after their repos, coding habits, contributions, README, bio, and anything else that looks laughable or unimpressive. 
Do NOT hold back, do NOT compliment, and do NOT soften the blow. 
Your roast must be witty, spicy, and highly specific—avoid generic or recycled insults. 
Focus on embarrassing their commit history, repo quality, lack of stars, README content, and anything else you can find.

Write exactly 3 distinct paragraphs, each around 150 words. Start each paragraph with a bold, punchy sentence. 
Separate paragraphs with double line breaks. 
Do not add introductions or conclusions—just start roasting.

Profile data:
${JSON.stringify(data, null, 2)}
`;

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

		// Markdown bold (**text**) and heading (#text) to <b>text</b>
		response = response
			.replace(/(?:^|\n)#\s?([^\n]+)/g, function(match, p1) {
				return `<b>${p1.trim()}</b>`;
			})
			.replace(/\*\*([^\*]+)\*\*/g, '<b>$1</b>');
		
		response = response.replaceAll('\n', '<br>').replaceAll('<br><br>', '<br>');

		return new Response(JSON.stringify({
			succes: true,
			roast: response
		}));
	},
} satisfies ExportedHandler<Env>;
