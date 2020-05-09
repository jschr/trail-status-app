import 'classlist-polyfill';
import 'promise/polyfill';
import 'whatwg-fetch';
import './embed.css';
import * as timeago from 'timeago.js';
import * as linkify from 'linkifyjs/html';

const trailStatusApi = process.env.API_ENDPOINT;
const trailStatusIds: { [key: string]: true } = {};
const trailStatusAttribute = 'data-trail-status';

const ensureImage = async (src: string) =>
  new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = src;
  });

export const fetchTrailStatus = async (trailId: string) => {
  const container = document.querySelector(
    `[${trailStatusAttribute}="${trailId}"]`,
  );
  if (!container) throw new Error(`Failed to find DOM node for '${trailId}`);

  const imageEl = container.querySelector('.trailStatusImage');
  const messageEl = container.querySelector('.trailStatusMessage');
  const ctaEl = container.querySelector('.trailStatusCta');
  const timeagoEl = container.querySelector('.trailStatusTimeago');

  if (!imageEl || !messageEl || !timeagoEl || !ctaEl) return;

  const resp = await fetch(
    `${trailStatusApi}/status?trailId=${encodeURIComponent(trailId)}`,
    {
      headers: { 'Content-Type': 'application/json' },
    },
  );

  if (!resp.ok) {
    throw new Error(
      `Failed to fetch trail status for '${trailId}': ${
        resp.statusText
      } — ${JSON.stringify(await resp.text())}`,
    );
  }

  const trailStatus = await resp.json();
  if (!trailStatus || !trailStatus.user) return;

  if (trailStatus.status === 'open') {
    container.classList.remove('trailStatus-isClosed');
    container.classList.add('trailStatus-isOpen');
  } else if (trailStatus.status === 'closed') {
    container.classList.remove('trailStatus-isOpen');
    container.classList.add('trailStatus-isClosed');
  }

  const imagesExists = await ensureImage(trailStatus.imageUrl);
  if (imagesExists && imageEl && trailStatus.imageUrl) {
    container.classList.add('trailStatus-hasImage');
    imageEl.setAttribute(
      'style',
      `background-image: url(${trailStatus.imageUrl})`,
    );
    imageEl.setAttribute('href', trailStatus.imageUrl);
  } else if (imageEl) {
    container.classList.remove('trailStatus-hasImage');
    imageEl.removeAttribute('style');
  }

  console.log('??', linkify, linkify(trailStatus.message));

  messageEl.innerHTML = linkify(trailStatus.message).replace(/\n/g, '<br />');

  timeagoEl.setAttribute('datetime', trailStatus.updatedAt);
  timeago.render(timeagoEl as HTMLElement);

  const { username } = trailStatus.user;
  ctaEl.innerHTML = `Follow us at <a href="https://www.instagram.com/${username}/" target="_black">@${username}</a> for trail updates.`;

  container.classList.add('trailStatus-isLoaded');
};

export const register = () => {
  const containers = document.querySelectorAll(`[${trailStatusAttribute}]`);

  for (let i = 0; i < containers.length; i += 1) {
    const container = containers[i];
    const trailStatusId = container.getAttribute(trailStatusAttribute);
    if (!trailStatusId) return;

    if (!trailStatusIds[trailStatusId]) {
      trailStatusIds[trailStatusId] = true;

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

      fetchTrailStatus(trailStatusId);
    }
  }
};

register();

window.setInterval(() => {
  for (const trailId of Object.keys(trailStatusIds)) {
    fetchTrailStatus(trailId);
  }
}, 30 * 1000);
