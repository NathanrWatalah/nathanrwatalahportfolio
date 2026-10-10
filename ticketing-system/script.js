const tickets = [
  { id: 'HD-1048', requester: 'Maria J.', department: 'Finance', category: 'Software', priority: 'High', status: 'In Progress', assignee: 'Nia B.', updated: '08:45 AM', subject: 'Microsoft Excel crashes on open', description: 'Excel freezes immediately after opening the workbook and the process becomes unresponsive. This started after the last update and affects two users in the finance team.' },
  { id: 'HD-1049', requester: 'George K.', department: 'Operations', category: 'Network', priority: 'Critical', status: 'New', assignee: 'Marco T.', updated: '09:10 AM', subject: 'VPN connection fails at remote site', description: 'The internet is available but the remote desktop and VPN session keep disconnecting. The user is unable to access internal systems from the field office.' },
  { id: 'HD-1050', requester: 'Alicia T.', department: 'Human Resources', category: 'Account access', priority: 'Medium', status: 'Waiting', assignee: 'Riley S.', updated: '10:22 AM', subject: 'MFA challenge not receiving codes', description: 'The user is not receiving authentication codes on the authenticator app and cannot log in to payroll systems. Reset has been requested and is pending review.' },
  { id: 'HD-1051', requester: 'James D.', department: 'IT', category: 'Hardware', priority: 'Low', status: 'Resolved', assignee: 'Dylan P.', updated: '11:05 AM', subject: 'Laptop battery not charging', description: 'The battery indicator remained at 0% even while plugged in. The charger was replaced and the battery calibration was completed.' },
  { id: 'HD-1052', requester: 'Fatu S.', department: 'Sales', category: 'Security', priority: 'High', status: 'New', assignee: 'Sara L.', updated: '12:40 PM', subject: 'Phishing alert on shared inbox', description: 'An email was reported as suspicious and a potential phishing attempt was detected. User has already flagged the message and the mailbox is under review.' },
  { id: 'HD-1053', requester: 'Henry M.', department: 'Administration', category: 'Software', priority: 'Medium', status: 'In Progress', assignee: 'Nia B.', updated: '01:18 PM', subject: 'Printer drivers not installing on workstation', description: 'The workstation is unable to detect the printer queue after installing the latest driver package. Troubleshooting is currently in progress.' },
  { id: 'HD-1054', requester: 'Abigail R.', department: 'Finance', category: 'Account access', priority: 'Critical', status: 'Waiting', assignee: 'Marco T.', updated: '02:35 PM', subject: 'Locked out of accounting system', description: 'Repeated failed sign-in attempts triggered an account lockout. The user cannot access financial approval tools and requires urgent access restoration.' },
  { id: 'HD-1055', requester: 'David W.', department: 'IT', category: 'Network', priority: 'Medium', status: 'Resolved', assignee: 'Dylan P.', updated: '03:50 PM', subject: 'Wi-Fi disconnects in office conference room', description: 'Users reported unstable connectivity during meetings. The access point was reset and the signal strength has stabilized after network review.' }
];

const tableBody = document.getElementById('ticketTableBody');
const form = document.getElementById('ticketForm');
const filterButtons = document.querySelectorAll('.filter-btn');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const ticketNotice = document.getElementById('ticketNotice');
const themeToggle = document.getElementById('themeToggle');
const modal = document.getElementById('ticketModal');
const modalClose = document.getElementById('modalClose');
const modalTitle = document.getElementById('modalTitle');
const modalRequester = document.getElementById('modalRequester');
const modalDepartment = document.getElementById('modalDepartment');
const modalPriority = document.getElementById('modalPriority');
const modalStatus = document.getElementById('modalStatus');
const modalSubject = document.getElementById('modalSubject');
const modalDescription = document.getElementById('modalDescription');
const modalStatusSelect = document.getElementById('modalStatusSelect');
const modalPrioritySelect = document.getElementById('modalPrioritySelect');
const modalNotes = document.getElementById('modalNotes');
const assigneeSelect = document.getElementById('assigneeSelect');
const saveTicketUpdateButton = document.getElementById('saveTicketUpdate');
const resolveTicketButton = document.getElementById('resolveTicket');
const openTicketCount = document.getElementById('openTicketCount');
const criticalCount = document.getElementById('criticalCount');
const resolvedCount = document.getElementById('resolvedCount');
const totalTickets = document.getElementById('totalTickets');
const urgentTickets = document.getElementById('urgentTickets');
const resolvedStats = document.getElementById('resolvedStats');
const workloadCards = document.querySelectorAll('.workload-card');

let activeFilter = 'all';
let searchText = '';
let sortMode = 'updated';

function getPriorityClass(priority) { return `priority-${priority.toLowerCase().replace(/\s+/g, '-')}`; }
function getStatusClass(status) { return status.toLowerCase().replace(/\s+/g, '-'); }
function updateWorkload() {
  const workload = tickets.reduce((acc, ticket) => {
    const assignee = ticket.assignee || 'Unassigned';
    acc[assignee] = (acc[assignee] || 0) + 1;
    return acc;
  }, {});

  workloadCards.forEach(card => {
    const name = card.dataset.agent;
    const count = workload[name] || 0;
    const countEl = card.querySelector('.workload-count');
    const badgeEl = card.querySelector('.workload-badge');
    if (countEl) countEl.textContent = count;
    if (badgeEl) badgeEl.textContent = count > 0 ? `${count} active` : 'Idle';
  });
}
function updateThemeButton() { const darkMode = document.body.classList.contains('dark-mode'); themeToggle.textContent = darkMode ? '🌙' : '☀️'; }
function applySavedTheme() {
  const savedTheme = localStorage.getItem('watalah-helpdesk-theme');
  if (savedTheme === 'dark') document.body.classList.add('dark-mode');
  updateThemeButton();
}
function updateStats() {
  const openCount = tickets.filter(ticket => ticket.status !== 'Resolved').length;
  const critical = tickets.filter(ticket => ticket.priority === 'Critical').length;
  const resolved = tickets.filter(ticket => ticket.status === 'Resolved').length;
  const urgent = tickets.filter(ticket => ticket.priority === 'Critical' || ticket.priority === 'High').length;
  openTicketCount.textContent = String(openCount).padStart(3, '0');
  criticalCount.textContent = String(critical).padStart(2, '0');
  resolvedCount.textContent = String(resolved).padStart(2, '0');
  totalTickets.textContent = String(tickets.length).padStart(3, '0');
  urgentTickets.textContent = String(urgent).padStart(2, '0');
  resolvedStats.textContent = String(resolved).padStart(2, '0');
}
function getFilteredTickets() {
  let filtered = [...tickets];
  if (activeFilter !== 'all') filtered = filtered.filter(ticket => ticket.status === activeFilter);
  if (searchText) {
    const query = searchText.trim().toLowerCase();
    filtered = filtered.filter(ticket => [ticket.id, ticket.requester, ticket.department, ticket.category, ticket.priority, ticket.status, ticket.subject, ticket.description].some(value => String(value).toLowerCase().includes(query)));
  }
  if (sortMode === 'priority') {
    const order = { Critical: 4, High: 3, Medium: 2, Low: 1 };
    filtered.sort((a, b) => (order[b.priority] ?? 0) - (order[a.priority] ?? 0));
  } else if (sortMode === 'requester') {
    filtered.sort((a, b) => a.requester.localeCompare(b.requester));
  } else {
    filtered.sort((a, b) => a.id.localeCompare(b.id));
  }
  return filtered;
}
function renderTable() {
  const visibleTickets = getFilteredTickets();
  if (!visibleTickets.length) {
    tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; color: var(--muted); padding: 24px;">No tickets match your search.</td></tr>';
    return;
  }
  tableBody.innerHTML = visibleTickets.map(ticket => `
    <tr data-ticket-id="${ticket.id}">
      <td class="ticket-id">${ticket.id}</td>
      <td>${ticket.requester}</td>
      <td>${ticket.category}</td>
      <td><span class="ticket-priority ${getPriorityClass(ticket.priority)}">${ticket.priority}</span></td>
      <td><span class="ticket-status ${getStatusClass(ticket.status)}">${ticket.status}</span></td>
      <td>${ticket.updated}</td>
    </tr>
  `).join('');
  tableBody.querySelectorAll('tr[data-ticket-id]').forEach(row => row.addEventListener('click', () => openTicketDetails(row.dataset.ticketId)));
}
let currentTicketId = null;

function openTicketDetails(ticketId) {
  const selectedTicket = tickets.find(ticket => ticket.id === ticketId);
  if (!selectedTicket) return;
  currentTicketId = ticketId;
  modalTitle.textContent = selectedTicket.id;
  modalRequester.textContent = selectedTicket.requester;
  modalDepartment.textContent = selectedTicket.department;
  modalPriority.textContent = selectedTicket.priority;
  modalStatus.textContent = selectedTicket.status;
  modalPrioritySelect.value = selectedTicket.priority;
  modalStatusSelect.value = selectedTicket.status;
  assigneeSelect.value = selectedTicket.assignee || 'Unassigned';
  modalSubject.textContent = selectedTicket.subject;
  modalDescription.textContent = selectedTicket.description;
  modalNotes.value = '';
  modal.classList.remove('hidden');
  modal.setAttribute('aria-hidden', 'false');
}
function closeTicketDetails() { modal.classList.add('hidden'); modal.setAttribute('aria-hidden', 'true'); currentTicketId = null; }
function saveTicketUpdate() {
  if (!currentTicketId) return;
  const ticket = tickets.find(item => item.id === currentTicketId);
  if (!ticket) return;
  ticket.status = modalStatusSelect.value;
  ticket.priority = modalPrioritySelect.value;
  ticket.assignee = assigneeSelect.value === 'Unassigned' ? 'Unassigned' : assigneeSelect.value;
  if (modalNotes.value.trim()) {
    ticket.description = `${ticket.description} Notes: ${modalNotes.value.trim()}`;
  }
  updateStats();
  updateWorkload();
  renderTable();
  closeTicketDetails();
  ticketNotice.textContent = `Ticket ${ticket.id} updated successfully.`;
  ticketNotice.style.color = '#10b981';
}
function resolveTicket() {
  if (!currentTicketId) return;
  const ticket = tickets.find(item => item.id === currentTicketId);
  if (!ticket) return;
  ticket.status = 'Resolved';
  ticket.priority = modalPrioritySelect.value || ticket.priority;
  ticket.assignee = assigneeSelect.value === 'Unassigned' ? 'Unassigned' : assigneeSelect.value;
  updateStats();
  updateWorkload();
  renderTable();
  closeTicketDetails();
  ticketNotice.textContent = `Ticket ${ticket.id} marked as resolved.`;
  ticketNotice.style.color = '#10b981';
}
filterButtons.forEach(button => {
  button.addEventListener('click', () => {
    activeFilter = button.dataset.filter;
    filterButtons.forEach(item => item.classList.toggle('active', item === button));
    renderTable();
  });
});
searchInput.addEventListener('input', event => { searchText = event.target.value; renderTable(); });
sortSelect.addEventListener('change', event => { sortMode = event.target.value; renderTable(); });
form.addEventListener('submit', event => {
  event.preventDefault();
  const formData = new FormData(form);
  const name = String(formData.get('name') || '').trim();
  const department = String(formData.get('department') || '').trim();
  const category = String(formData.get('category') || '').trim();
  const priority = String(formData.get('priority') || '').trim();
  const subject = String(formData.get('subject') || '').trim();
  const description = String(formData.get('description') || '').trim();
  if (!name || !department || !category || !priority || !subject || !description) {
    ticketNotice.textContent = 'Please complete all ticket fields before submitting.';
    ticketNotice.style.color = '#f87171';
    return;
  }
  const idNumber = 1056 + tickets.length;
  const newTicket = { id: `HD-${idNumber}`, requester: name, department, category, priority, status: 'New', assignee: 'Unassigned', updated: 'just now', subject, description };
  tickets.unshift(newTicket);
  updateStats();
  updateWorkload();
  renderTable();
  form.reset();
  ticketNotice.textContent = `Ticket ${newTicket.id} submitted successfully.`;
  ticketNotice.style.color = '#10b981';
  window.location.hash = '#ticket-queue';
});
modalClose.addEventListener('click', closeTicketDetails);
saveTicketUpdateButton.addEventListener('click', saveTicketUpdate);
resolveTicketButton.addEventListener('click', resolveTicket);
modal.addEventListener('click', event => { if (event.target === modal) closeTicketDetails(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !modal.classList.contains('hidden')) closeTicketDetails(); });
themeToggle.addEventListener('click', () => {
  const darkMode = document.body.classList.toggle('dark-mode');
  localStorage.setItem('watalah-helpdesk-theme', darkMode ? 'dark' : 'light');
  updateThemeButton();
});
applySavedTheme();
updateStats();
updateWorkload();
renderTable();
