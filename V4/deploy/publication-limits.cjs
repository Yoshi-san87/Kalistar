'use strict';
const MIB = 1024 ** 2;
const GITHUB_BUDGET = 900 * MIB;
const CLOUDFLARE_FILE_LIMIT = 20000;
const CLOUDFLARE_ASSET_LIMIT = 25 * MIB;

function assertPublicationLimits(assets, environment = process.env) {
  if (environment.CF_PAGES !== '1') {
    if (assets.reduce((bytes, asset) => bytes + asset.bytes, 0) > GITHUB_BUDGET) {
      throw Error('Static publication exceeds 900 MiB budget');
    }
    return;
  }
  if (assets.length > CLOUDFLARE_FILE_LIMIT) {
    throw Error('Cloudflare publication exceeds 20000 files');
  }
  for (const asset of assets) {
    if (asset.bytes > CLOUDFLARE_ASSET_LIMIT) {
      throw Error('Cloudflare asset exceeds 25 MiB: ' + asset.path);
    }
  }
}

module.exports = {assertPublicationLimits, GITHUB_BUDGET, CLOUDFLARE_FILE_LIMIT, CLOUDFLARE_ASSET_LIMIT};
