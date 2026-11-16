export async function releaseBackend({ projectRef, publicUrl, accessToken }, io) {
  if (!/^[a-z]{20}$/.test(projectRef) || !accessToken?.trim() ||
      publicUrl?.replace(/\/$/, "") !== `https://${projectRef}.supabase.co`) {
    throw new Error("Invalid Supabase deployment credentials or target");
  }

  const functions = ["hello", "quran"];
  const previous = await Promise.all(functions.map((slug) => io.version(slug)));
  await io.assertCurrent();
  for (const [index, slug] of functions.entries()) {
    const bundleUnchanged = await io.deploy(slug);
    const version = await io.version(slug, { requirePublic: true });
    const previousVersion = previous[index] ?? 0;
    const bundleVerified = version > previousVersion || (version === previousVersion && bundleUnchanged === true);
    if (!Number.isSafeInteger(version) || !bundleVerified) {
      throw new Error(`Unverified ${slug} deployment version`);
    }
    io.record(slug, version);
  }
  await io.smoke();
}
