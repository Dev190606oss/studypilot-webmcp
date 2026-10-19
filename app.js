(() => {
  'use strict';

  const STORAGE_KEY = 'studypilot-tasks-v1';
  const priorityRank = { High: 0, Medium: 1, Low: 2 };
  const today = () => new Date().toISOString().slice(0, 10);

  const escapeHtml = (value) =>
    String(value).replace(/[&<>'"]/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[char]));

  // Exactly ONE declaration of generateId that handles both secure (HTTPS/localhost)
  // and non-secure (HTTP IP addresses) contexts without throwing.
  const generateId = () => {
    try {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
      }
    } catch {
      // Fall through to fallback
    }
    return 'task-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  };

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
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === null) {
        const initial = sampleTasks();
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
        } catch (e) {
          console.warn('localStorage initialization failed:', e);
        }
        return initial;
      }
      const stored = JSON.parse(raw);
      if (!Array.isArray(stored)) {
        const initial = sampleTasks();
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
        } catch (e) {
          console.warn('localStorage reset failed:', e);
        }
        return initial;
      }
      if (stored.length === 0) {
        return [];
      }
      // Ensure all loaded tasks have valid fields so render() never encounters undefined properties
      return stored.map((t) => ({
        id: t.id || generateId(),
        title: String(t.title || 'Untitled task'),
        subject: String(t.subject || 'General'),
        date: String(t.date || today()),
        priority: ['Low', 'Medium', 'High'].includes(t.priority) ? t.priority : 'Medium',
        estimatedMinutes: Number(t.estimatedMinutes) > 0 ? Math.round(Number(t.estimatedMinutes)) : 30,
        completed: Boolean(t.completed)
      }));
    } catch {
      return sampleTasks();
    }
  }

  let tasks = loadTasks();

  function saveTasks() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (e) {
      console.warn('localStorage save failed:', e);
    }
  }

  function normalizedTask(input) {
    const title = String(input.title || '').trim();
    const subject = String(input.subject || '').trim();
    const date = String(input.date || today()).trim();
    const priority = String(input.priority || 'Medium');
    const estimatedMinutes = Number(input.estimatedMinutes);

    if (
      !title ||
      !subject ||
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !['Low', 'Medium', 'High'].includes(priority) ||
      !Number.isFinite(estimatedMinutes) ||
      estimatedMinutes < 1
    ) {
      throw new Error('Provide a title, subject, valid date, priority, and positive estimated minutes.');
    }

    return {
      id: generateId(),
      title,
      subject,
      date,
      priority,
      estimatedMinutes: Math.round(estimatedMinutes),
      completed: false
    };
  }

  function addTask(input) {
    const task = normalizedTask(input);
    tasks.unshift(task);
    saveTasks();
    render();
    return task;
  }

  function completeTask(taskId) {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return null;
    task.completed = true;
    saveTasks();
    render();
    return task;
  }

  function deleteTask(taskId) {
    const index = tasks.findIndex((item) => item.id === taskId);
    if (index === -1) return false;
    tasks.splice(index, 1);
    saveTasks();
    render();
    return true;
  }

  function getTasks({ date, includeCompleted } = {}) {
    return tasks.filter(
      (task) =>
        (!date || task.date === date) &&
        (includeCompleted !== false || !task.completed)
    );
  }

  function planFor(date) {
    return getTasks({ date, includeCompleted: false }).sort(
      (a, b) =>
        priorityRank[a.priority] - priorityRank[b.priority] ||
        a.estimatedMinutes - b.estimatedMinutes
    );
  }

  function formatDate(value) {
    try {
      const d = new Date(`${value}T12:00:00`);
      if (isNaN(d.getTime())) return String(value);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return String(value);
    }
  }

  function render() {
    const taskList = document.querySelector('#task-list');
    const template = document.querySelector('#task-template');
    if (!taskList || !template) return;

    const completed = tasks.filter((task) => task.completed).length;
    const total = tasks.length;
    const todays = tasks.filter((task) => task.date === today() && !task.completed);
    const minutes = tasks.reduce((sum, task) => sum + (Number(task.estimatedMinutes) || 0), 0);
    const progress = total ? Math.round((completed / total) * 100) : 0;

    const todayCount = document.querySelector('#today-count');
    if (todayCount) todayCount.textContent = todays.length;
    const todayDetail = document.querySelector('#today-detail');
    if (todayDetail) todayDetail.textContent = todays.length ? `${todays.length} to focus on today` : 'Nothing scheduled today';

    const completedCount = document.querySelector('#completed-count');
    if (completedCount) completedCount.textContent = completed;
    const completedDetail = document.querySelector('#completed-detail');
    if (completedDetail) completedDetail.textContent = completed ? `${completed} task${completed === 1 ? '' : 's'} checked off` : 'Keep the momentum going';

    const hoursCount = document.querySelector('#hours-count');
    if (hoursCount) hoursCount.textContent = `${(minutes / 60).toFixed(minutes % 60 ? 1 : 0)}h`;

    const progressCount = document.querySelector('#progress-count');
    if (progressCount) progressCount.textContent = `${progress}%`;
    const progressBar = document.querySelector('#progress-bar');
    if (progressBar) progressBar.style.width = `${progress}%`;
    const progressDetail = document.querySelector('#progress-detail');
    if (progressDetail) progressDetail.textContent = total ? `${completed} of ${total} tasks complete` : 'Ready when you are';

    const taskTotal = document.querySelector('#task-total');
    if (taskTotal) taskTotal.textContent = `${total} task${total === 1 ? '' : 's'}`;

    taskList.innerHTML = '';
    if (!total) {
      taskList.innerHTML = '<div class="empty-state"><div><span>✦</span><h3>Your planner is clear</h3><p>Add a task to start building a focused study day.</p></div></div>';
      return;
    }

    tasks
      .slice()
      .sort((a, b) => Number(a.completed) - Number(b.completed) || a.date.localeCompare(b.date) || priorityRank[a.priority] - priorityRank[b.priority])
      .forEach((task) => {
        const node = template.content.cloneNode(true);
        const item = node.querySelector('.task-item');
        if (item) item.classList.toggle('completed', Boolean(task.completed));

        const titleEl = node.querySelector('h3');
        if (titleEl) titleEl.textContent = task.title;

        const subjectEl = node.querySelector('.subject');
        if (subjectEl) subjectEl.textContent = task.subject;

        const dateEl = node.querySelector('.date');
        if (dateEl) dateEl.textContent = formatDate(task.date);

        const durationEl = node.querySelector('.duration');
        if (durationEl) durationEl.textContent = `${task.estimatedMinutes} min`;

        const priority = node.querySelector('.priority');
        if (priority) {
          priority.textContent = task.priority;
          priority.classList.add((task.priority || 'medium').toLowerCase());
        }

        const checkBtn = node.querySelector('.check-button');
        if (checkBtn) {
          checkBtn.addEventListener('click', () => {
            if (!task.completed) completeTask(task.id);
          });
        }

        const deleteBtn = node.querySelector('.delete-button');
        if (deleteBtn) {
          deleteBtn.addEventListener('click', () => deleteTask(task.id));
        }

        taskList.append(node);
      });
  }

  function displayPlan(date = today()) {
    const plan = planFor(date);
    const content = document.querySelector('#plan-content');
    if (!content) return plan;

    if (!plan.length) {
      content.className = 'plan-empty';
      content.innerHTML = `<span>☀</span><p>No incomplete tasks for ${escapeHtml(formatDate(date))}. You’re all clear!</p>`;
      return plan;
    }

    content.className = 'plan-list';
    content.innerHTML = plan
      .map(
        (task, i) =>
          `<div class="plan-step"><span class="step-number">${i + 1}</span><div><strong>${escapeHtml(task.title)}</strong><small>${escapeHtml(task.subject)} · ${task.estimatedMinutes} min · ${task.priority}</small></div></div>`
      )
      .join('');
    return plan;
  }

  // Bind UI Events
  const dateInput = document.querySelector('#date');
  if (dateInput) dateInput.value = today();

  const taskForm = document.querySelector('#task-form');
  if (taskForm) {
    taskForm.addEventListener('submit', (event) => {
      event.preventDefault();
      event.stopPropagation();
      try {
        const formData = new FormData(taskForm);
        const data = Object.fromEntries(formData.entries());
        addTask(data);
        taskForm.reset();
        if (dateInput) dateInput.value = today();
        const minInput = document.querySelector('#estimatedMinutes');
        if (minInput) minInput.value = 30;
      } catch (error) {
        alert(error.message);
      }
      return false;
    });
  }

  const genPlanBtn = document.querySelector('#generate-plan');
  if (genPlanBtn) {
    genPlanBtn.addEventListener('click', () => displayPlan());
  }

  // Automatic Query String Recovery: If form previously submitted via native GET, recover the task safely without duplicates
  try {
    if (typeof window !== 'undefined' && window.location && window.location.search) {
      const params = new URLSearchParams(window.location.search);
      if (params.has('title') && params.has('subject')) {
        const candidateTitle = String(params.get('title') || '').trim();
        const candidateSubject = String(params.get('subject') || '').trim();
        const candidateDate = String(params.get('date') || today()).trim();
        const candidatePriority = params.get('priority') || 'Medium';
        const candidateMinutes = params.get('estimatedMinutes') || 30;

        const isDuplicate = tasks.some(
          (t) =>
            t.title.trim().toLowerCase() === candidateTitle.toLowerCase() &&
            t.subject.trim().toLowerCase() === candidateSubject.toLowerCase() &&
            t.date === candidateDate
        );

        if (!isDuplicate && candidateTitle && candidateSubject) {
          addTask({
            title: candidateTitle,
            subject: candidateSubject,
            date: candidateDate,
            priority: candidatePriority,
            estimatedMinutes: candidateMinutes
          });
        }
        if (window.history && window.history.replaceState) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    }
  } catch (e) {
    console.warn('Query parameter recovery:', e);
  }

  function registerWebMCPTools() {
    if (!document.modelContext || typeof document.modelContext.registerTool !== 'function') return false;
    const string = { type: 'string' };
    const boolean = { type: 'boolean' };
    const number = { type: 'number' };
    document.modelContext.registerTool({
      name: 'add_study_task',
      description: 'Add a new study task to the student’s planner.',
      inputSchema: {
        type: 'object',
        properties: {
          title: string,
          subject: string,
          date: string,
          priority: { type: 'string', enum: ['Low', 'Medium', 'High'] },
          estimatedMinutes: number
        },
        required: ['title', 'subject', 'date', 'priority', 'estimatedMinutes']
      },
      execute: async (input) => {
        try {
          const task = addTask(input);
          return { success: true, task, message: `Added “${task.title}”.` };
        } catch (error) {
          return { success: false, error: error.message };
        }
      }
    });
    document.modelContext.registerTool({
      name: 'get_study_tasks',
      description: 'Get study tasks from the student’s planner.',
      inputSchema: {
        type: 'object',
        properties: { date: string, includeCompleted: boolean }
      },
      execute: async (input = {}) => {
        const result = getTasks(input);
        return { success: true, tasks: result, count: result.length, filters: { date: input.date || null, includeCompleted: input.includeCompleted !== false } };
      }
    });
    document.modelContext.registerTool({
      name: 'complete_study_task',
      description: 'Mark a study task as completed.',
      inputSchema: { type: 'object', properties: { taskId: string }, required: ['taskId'] },
      execute: async (input) => {
        const task = completeTask(input.taskId);
        return task ? { success: true, task, message: `Completed “${task.title}”.` } : { success: false, error: 'Task not found.' };
      }
    });
    document.modelContext.registerTool({
      name: 'delete_study_task',
      description: 'Delete a study task.',
      inputSchema: { type: 'object', properties: { taskId: string }, required: ['taskId'] },
      execute: async (input) => {
        const deleted = deleteTask(input.taskId);
        return deleted ? { success: true, taskId: input.taskId, message: 'Task deleted.' } : { success: false, taskId: input.taskId, error: 'Task not found.' };
      }
    });
    document.modelContext.registerTool({
      name: 'generate_study_plan',
      description: 'Generate an ordered study plan from incomplete study tasks.',
      inputSchema: { type: 'object', properties: { date: string }, required: ['date'] },
      execute: async (input) => {
        const plan = planFor(input.date);
        if (input.date === today()) displayPlan(input.date);
        return {
          success: true,
          date: input.date,
          plan: plan.map((task, index) => ({ order: index + 1, ...task })),
          totalMinutes: plan.reduce((sum, task) => sum + task.estimatedMinutes, 0),
          message: plan.length ? `Generated a ${plan.length}-task plan.` : 'No incomplete tasks found for this date.'
        };
      }
    });
    return true;
  }

  const available = registerWebMCPTools();
  const status = document.querySelector('#webmcp-status');
  if (status) {
    const statusText = document.querySelector('#webmcp-status-text');
    if (statusText) statusText.textContent = available ? 'WebMCP Ready' : 'WebMCP unavailable';
    status.classList.toggle('ready', available);
    status.title = available ? 'AI agent tools are registered' : 'This browser does not expose WebMCP';
  }

  render();
})();
