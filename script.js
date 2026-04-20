const API = 'http://localhost:3000';

const form = document.getElementById('projectForm');
const projectList = document.getElementById('projectList');
const projectDetails = document.getElementById('projectDetails');
const refreshBtn = document.getElementById('refreshBtn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const payload = {
    name: document.getElementById('name').value.trim(),
    area: Number(document.getElementById('area').value),
    rooms: Number(document.getElementById('rooms').value),
  };

  const res = await fetch(`${API}/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await res.json();

  if (!res.ok) {
    alert(data.error || 'Gabim gjate ruajtjes.');
    return;
  }

  window.location.href = `drawing.html?projectId=${data.id}`;
});

refreshBtn.addEventListener('click', loadProjects);

async function loadProjects() {
  const res = await fetch(`${API}/projects`);
  const projects = await res.json();

  if (!Array.isArray(projects) || projects.length === 0) {
    projectList.innerHTML = '<p>Nuk ka projekte ende.</p>';
    return;
  }

  projectList.innerHTML = projects
    .map(
      (p) => `
      <div class="project-item">
        <div>
          <strong>${escapeHtml(p.name)}</strong>
          <div class="small">${p.area}m² | ${p.rooms} dhoma | ID: ${p.id}</div>
        </div>
        <div class="project-actions">
          <button onclick="showProject(${p.id})">Shfaq</button>
          <button class="secondary" onclick="openDrawing(${p.id})">Vizato</button>
          <button class="danger" onclick="deleteProject(${p.id})">Fshij</button>
        </div>
      </div>
    `,
    )
    .join('');
}

async function showProject(id) {
  const res = await fetch(`${API}/projects/${id}`);
  const p = await res.json();

  if (!res.ok) {
    projectDetails.innerHTML = `<p>${p.error || 'Gabim.'}</p>`;
    return;
  }

  const roomsHtml = p.data.dhomat
    .map((d) => `<li>${escapeHtml(d.emri)} - ${d.siperfaqe_m2}m² - ${d.radiatore} radiator(e)</li>`)
    .join('');

  projectDetails.innerHTML = `
    <h3>${escapeHtml(p.name)}</h3>
    <p><strong>Siperfaqe:</strong> ${p.area}m²</p>
    <p><strong>Dhoma:</strong> ${p.rooms}</p>
    <p><strong>Boiler i sugjeruar:</strong> ${p.data.boiler}</p>
    <p><strong>Radiatore total:</strong> ${p.data.radiatore_total}</p>
    <p><strong>Tubat:</strong> ${escapeHtml(p.data.tuba)}</p>
    <strong>Detajet per dhoma:</strong>
    <ul>${roomsHtml}</ul>
    <button onclick="openDrawing(${p.id})">Hap Vizatimin</button>
  `;
}

function openDrawing(id) {
  window.location.href = `drawing.html?projectId=${id}`;
}

async function deleteProject(id) {
  const ok = confirm('A je i sigurt qe do ta fshish projektin?');
  if (!ok) return;

  const res = await fetch(`${API}/projects/${id}`, { method: 'DELETE' });
  const data = await res.json();

  if (!res.ok) {
    alert(data.error || 'Gabim gjate fshirjes.');
    return;
  }

  projectDetails.innerHTML = 'Zgjidh nje projekt nga lista.';
  await loadProjects();
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

window.showProject = showProject;
window.deleteProject = deleteProject;
window.openDrawing = openDrawing;

loadProjects();
