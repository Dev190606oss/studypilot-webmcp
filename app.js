(() => {
  'use strict';
  const STORAGE_KEY = 'studypilot-tasks-v1';
  const priorityRank = { High: 0, Medium: 1, Low: 2 };
  const today = () => new Date().toISOString().slice(0, 10);
  const escapeHtml = (value) => String(value).replace(/[&<>'"]/g, (char) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));

  const generateId = () => (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
    ? crypto.randomUUID()
    : 'task-' + Date.now() + '-' + Math.random().toString(36).slice(2, 9);

  function sampleTasks() {
    const date = today();
    return [
      { id: generateId(), title: 'Review organic chemistry notes', subject: 'Chemistry', date, priority: 'High', estimatedMinutes: 45, completed: false },
      { id: generateId(), title: 'Finish problem set 4', subject: 'Calculus', date, priority: 'High', estimatedMinutes: 60, completed: false },
      { id: generateId(), title: 'Read research article', subject: 'Psychology', date, priority: 'Medium', estimatedMinutes: 30, completed: false },
      { id: generateId(), title: 'Organize lecture slides', subject: 'History', date, priority: 'Low', estimatedMinutes: 20, completed: true }
    ];
  }
  function loadTasks() {
    try { const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)); return Array.isArray(stored) ? stored : sampleTasks(); }
    catch { return sampleTasks(); }
  }
  let tasks = loadTasks();
  function saveTasks() { localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks)); }
  function normalizedTask(input) {
    const title = String(input.title || '').trim(), subject = String(input.subject || '').trim();
    const date = String(input.date || '').trim(), priority = String(input.priority || 'Medium');
    const estimatedMinutes = Number(input.estimatedMinutes);
    if (!title || !subject || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !['Low','Medium','High'].includes(priority) || !Number.isFinite(estimatedMinutes) || estimatedMinutes < 1) throw new Error('Provide a title, subject, valid date, priority, and positive estimated minutes.');
    return { id: generateId(), title, subject, date, priority, estimatedMinutes: Math.round(estimatedMinutes), completed: false };
  }
  function addTask(input) { const task = normalizedTask(input); tasks.unshift(task); saveTasks(); render(); return task; }
  function completeTask(taskId) { const task = tasks.find((item) => item.id === taskId); if (!task) return null; task.completed = true; saveTasks(); render(); return task; }
  function deleteTask(taskId) { const index = tasks.findIndex((item) => item.id === taskId); if (index === -1) return false; tasks.splice(index, 1); saveTasks(); render(); return true; }
  function getTasks({ date, includeCompleted } = {}) { return tasks.filter((task) => (!date || task.date === date) && (includeCompleted !== false || !task.completed)); }
  function planFor(date) { return getTasks({ date, includeCompleted: false }).sort((a,b) => priorityRank[a.priority] - priorityRank[b.priority] || a.estimatedMinutes - b.estimatedMinutes); }
  function formatDate(value) { return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, { month:'short', day:'numeric' }); }
  function render() {
    const taskList = document.querySelector('#task-list'); const template = document.querySelector('#task-template');
    const completed = tasks.filter((task) => task.completed).length, total = tasks.length, todays = tasks.filter((task) => task.date === today() && !task.completed);
    const minutes = tasks.reduce((sum, task) => sum + task.estimatedMinutes, 0), progress = total ? Math.round((completed / total) * 100) : 0;
    document.querySelector('#today-count').textContent = todays.length; document.querySelector('#today-detail').textContent = todays.length ? `${todays.length} to focus on today` : 'Nothing scheduled today';
    document.querySelector('#completed-count').textContent = completed; document.querySelector('#completed-detail').textContent = completed ? `${completed} task${completed === 1 ? '' : 's'} checked off` : 'Keep the momentum going';
    document.querySelector('#hours-count').textContent = `${(minutes / 60).toFixed(minutes % 60 ? 1 : 0)}h`; document.querySelector('#progress-count').textContent = `${progress}%`; document.querySelector('#progress-bar').style.width = `${progress}%`; document.querySelector('#progress-detail').textContent = total ? `${completed} of ${total} tasks complete` : 'Ready when you are'; document.querySelector('#task-total').textContent = `${total} task${total === 1 ? '' : 's'}`;
    taskList.innerHTML = '';
    if (!total) { taskList.innerHTML = '<div class="empty-state"><div><span>✦</span><h3>Your planner is clear</h3><p>Add a task to start building a focused study day.</p></div></div>'; return; }
    tasks.sort((a,b) => a.completed - b.completed || a.date.localeCompare(b.date) || priorityRank[a.priority] - priorityRank[b.priority]).forEach((task) => {
      const node = template.content.cloneNode(true); const item = node.querySelector('.task-item'); item.classList.toggle('completed', task.completed);
      node.querySelector('h3').textContent = task.title; node.querySelector('.subject').textContent = task.subject; node.querySelector('.date').textContent = formatDate(task.date); node.querySelector('.duration').textContent = `${task.estimatedMinutes} min`;
      const priority = node.querySelector('.priority'); priority.textContent = task.priority; priority.classList.add(task.priority.toLowerCase());
      node.querySelector('.check-button').addEventListener('click', () => { if (!task.completed) completeTask(task.id); }); node.querySelector('.delete-button').addEventListener('click', () => deleteTask(task.id)); taskList.append(node);
    });
  }
  function displayPlan(date = today()) { const plan = planFor(date); const content = document.querySelector('#plan-content');
    if (!plan.length) { content.className = 'plan-empty'; content.innerHTML = `<span>☀</span><p>No incomplete tasks for ${escapeHtml(formatDate(date))}. You’re all clear!</p>`; return plan; }
    content.className = 'plan-list'; content.innerHTML = plan.map((task, i) => `<div class="plan-step"><span class="step-number">${i+1}</span><div><strong>${escapeHtml(task.title)}</strong><small>${escapeHtml(task.subject)} · ${task.estimatedMinutes} min · ${task.priority}</small></div></div>`).join(''); return plan;
  }
  document.querySelector('#date').value = today();
  document.querySelector('#task-form').addEventListener('submit', (event) => { event.preventDefault(); try { addTask(Object.fromEntries(new FormData(event.currentTarget))); event.currentTarget.reset(); document.querySelector('#date').value = today(); document.querySelector('#estimatedMinutes').value = 30; } catch (error) { alert(error.message); } });
  document.querySelector('#generate-plan').addEventListener('click', () => displayPlan());
  function registerWebMCPTools() {
    if (!document.modelContext || typeof document.modelContext.registerTool !== 'function') return false;
    const string = { type: 'string' }; const boolean = { type: 'boolean' }; const number = { type: 'number' };
    document.modelContext.registerTool({ name: 'add_study_task', description: 'Add a new study task to the student’s planner.', inputSchema: { type:'object', properties:{ title:string, subject:string, date:string, priority:{ type:'string', enum:['Low','Medium','High'] }, estimatedMinutes:number }, required:['title','subject','date','priority','estimatedMinutes'] }, execute: async (input) => { try { const task = addTask(input); return { success:true, task, message:`Added “${task.title}”.` }; } catch (error) { return { success:false, error:error.message }; } } });
    document.modelContext.registerTool({ name: 'get_study_tasks', description: 'Get study tasks from the student’s planner.', inputSchema: { type:'object', properties:{ date:string, includeCompleted:boolean } }, execute: async (input = {}) => { const result = getTasks(input); return { success:true, tasks:result, count:result.length, filters:{ date:input.date || null, includeCompleted:input.includeCompleted !== false } }; } });
    document.modelContext.registerTool({ name: 'complete_study_task', description: 'Mark a study task as completed.', inputSchema: { type:'object', properties:{ taskId:string }, required:['taskId'] }, execute: async (input) => { const task = completeTask(input.taskId); return task ? { success:true, task, message:`Completed “${task.title}”.` } : { success:false, error:'Task not found.' }; } });
    document.modelContext.registerTool({ name: 'delete_study_task', description: 'Delete a study task.', inputSchema: { type:'object', properties:{ taskId:string }, required:['taskId'] }, execute: async (input) => {
      const deleted = deleteTask(input.taskId);
      return deleted ? { success:true, taskId:input.taskId, message:'Task deleted.' } : { success:false, taskId:input.taskId, error:'Task not found.' };
    } });
    document.modelContext.registerTool({ name: 'generate_study_plan', description: 'Generate an ordered study plan from incomplete study tasks.', inputSchema: { type:'object', properties:{ date:string }, required:['date'] }, execute: async (input) => { const plan = planFor(input.date); if (input.date === today()) displayPlan(input.date); return { success:true, date:input.date, plan:plan.map((task, index) => ({ order:index+1, ...task })), totalMinutes:plan.reduce((sum, task) => sum + task.estimatedMinutes, 0), message:plan.length ? `Generated a ${plan.length}-task plan.` : 'No incomplete tasks found for this date.' }; } });
    return true;
  }
  const available = registerWebMCPTools(); const status = document.querySelector('#webmcp-status'); document.querySelector('#webmcp-status-text').textContent = available ? 'WebMCP Ready' : 'WebMCP unavailable'; status.classList.toggle('ready', available); status.title = available ? 'AI agent tools are registered' : 'This browser does not expose WebMCP';
  render();
})();
