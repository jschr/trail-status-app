import './embed.css';
import 'classlist-polyfill';
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
};

export const register = () => {
  document.querySelectorAll(`[${trailStatusAttribute}]`).forEach(container => {
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
  });
};

register();

window.setInterval(() => {
  Object.keys(trailStatusIds).forEach(fetchTrailStatus);
}, 30 * 1000);
