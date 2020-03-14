import 'classlist-polyfill';
import 'promise/polyfill';
import 'whatwg-fetch';
import './embed.css';

const trailStatusApi = process.env.API_ENDPOINT;
const trailStatusIds: { [key: string]: true } = {};
const trailStatusAttribute = 'data-trail-status';

export const fetchTrailStatus = async (trailId: string) => {
  const container = document.querySelector(
    `[${trailStatusAttribute}="${trailId}"]`,
  );
  if (!container) throw new Error(`Failed to find DOM node for '${trailId}`);

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
  if (trailStatus.status === 'open') {
    container.classList.remove('trailStatus-isClosed');
    container.classList.add('trailStatus-isOpen');
  } else if (trailStatus.status === 'closed') {
    container.classList.remove('trailStatus-isOpen');
    container.classList.add('trailStatus-isClosed');
  }

  const message = container.querySelector('.trailStatusMessage');
  if (!message) return;

  message.textContent = trailStatus.message;

  const cta = container.querySelector('.trailStatusCta');
  if (!cta || !trailStatus.user) return;

  const { username } = trailStatus.user;
  cta.innerHTML = `Follow us at <a href="https://www.instagram.com/${username}/" target="_black">@${username}</a> for trail updates.`;
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
        `<div class="trailStatusMessage"></div>`,
        `<div class="trailStatusCta"></div>`,
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
