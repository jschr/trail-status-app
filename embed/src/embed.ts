import 'classlist-polyfill';
import 'whatwg-fetch';
import './embed.css';
import * as timeago from 'timeago.js';
import * as linkify from 'linkifyjs/html';

const trailStatusApi = process.env.API_ENDPOINT;
const regionIds: { [key: string]: true } = {};
const trailStatusAttribute = 'data-trail-status';

const ensureImage = async (src: string) =>
  new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = src;
  });

export const fetchRegionStatus = async (regionId: string) => {
  const container = document.querySelector(
    `[${trailStatusAttribute}="${regionId}"]`,
  );
  if (!container) throw new Error(`Failed to find DOM node for '${regionId}`);

  const imageEl = container.querySelector('.trailStatusImage');
  const messageEl = container.querySelector('.trailStatusMessage');
  const ctaEl = container.querySelector('.trailStatusCta');
  const timeagoEl = container.querySelector('.trailStatusTimeago');

  if (!imageEl || !messageEl || !timeagoEl || !ctaEl) return;

  const resp = await fetch(
    `${trailStatusApi}/regions/status?id=${encodeURIComponent(regionId)}`,
    {
      headers: { 'Content-Type': 'application/json' },
    },
  );

  if (!resp.ok) {
    throw new Error(
      `Failed to fetch region status for '${regionId}': ${
        resp.statusText
      } — ${JSON.stringify(await resp.text())}`,
    );
  }

  const regionStatus = await resp.json();
  if (!regionStatus || !regionStatus.user) return;

  if (regionStatus.status === 'open') {
    container.classList.remove('trailStatus-isClosed');
    container.classList.add('trailStatus-isOpen');
  } else if (regionStatus.status === 'closed') {
    container.classList.remove('trailStatus-isOpen');
    container.classList.add('trailStatus-isClosed');
  }

  const imagesExists = await ensureImage(regionStatus.imageUrl);
  if (imagesExists && imageEl && regionStatus.imageUrl) {
    container.classList.add('trailStatus-hasImage');
    imageEl.setAttribute(
      'style',
      `background-image: url(${regionStatus.imageUrl})`,
    );
    imageEl.setAttribute('href', regionStatus.imageUrl);
  } else if (imageEl) {
    container.classList.remove('trailStatus-hasImage');
    imageEl.removeAttribute('style');
  }

  messageEl.innerHTML = linkify(regionStatus.message).replace(/\n/g, '<br />');

  timeagoEl.setAttribute('datetime', regionStatus.updatedAt);
  timeago.render(timeagoEl as HTMLElement);

  const { username } = regionStatus.user;
  ctaEl.innerHTML = `Follow us at <a href="https://www.instagram.com/${username}/" target="_black">@${username}</a> for trail updates.`;

  container.classList.add('trailStatus-isLoaded');
};

export const register = () => {
  const containers = document.querySelectorAll(`[${trailStatusAttribute}]`);

  for (let i = 0; i < containers.length; i += 1) {
    const container = containers[i];
    const regionId = container.getAttribute(trailStatusAttribute);
    if (!regionId) return;

    if (!regionIds[regionId]) {
      regionIds[regionId] = true;

      container.innerHTML = [
        `<div class="trailStatusInner">`,
        `<div class="trailStatusCallout">`,
        `<a class="trailStatusImage"></a>`,
        `<div class="trailStatusInfo">`,
        `<div class="trailStatusMessage"></div>`,
        `<div class="trailStatusTimestamp">`,
        `Updated <span class="trailStatusTimeago"></span>.`,
        `</div>`,
        `</div>`,
        `</div>`,
        `<div class="trailStatusCta"></div>`,
        `</div>`,
        `</div>`,
      ].join('');

      fetchRegionStatus(regionId);
    }
  }
};

register();

window.setInterval(() => {
  for (const regionId of Object.keys(regionIds)) {
    fetchRegionStatus(regionId);
  }
}, 30 * 1000);
