import { eventHandler } from "h3"

// Learn more: https://nitro.build/guide/routing
export default eventHandler((event) => {
	return new Response('Nothing to see here, call GET /protected to trigger the payment flow')
});
