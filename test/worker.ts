export default {
  fetch() {
    return new Response("Cloudflare test worker ready");
  },
} satisfies ExportedHandler<CloudflareEnv>;
