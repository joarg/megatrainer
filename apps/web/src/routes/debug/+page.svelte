<script lang="ts">
  const PHASES = [
    { value: 'basicInfo',             label: 'basicInfo' },
    { value: 'motivationsAndGoals',   label: 'motivationsAndGoals' },
    { value: 'backgroundAndMetrics',  label: 'backgroundAndMetrics' },
    { value: 'toolsAndTime',          label: 'toolsAndTime' },
  ];

  // — form state —
  let phase         = $state('basicInfo');
  let phaseAttempts = $state(0);
  let userMessage   = $state('');
  let trainerName   = $state('Alex');
  let personality   = $state('friendly and motivating');
  let selectedSport = $state('running');
  let lastAssistantMessage = $state('');
  let currentUserProfileJson = $state('{}');
  let profileJsonError = $state('');

  // — output state —
  type TurnEntry = {
    userMessage: string;
    assistantMessage: string;
    nextPhase: string;
    phaseComplete: boolean;
    phaseAttemptsBefore: number;
    updatedUserProfile: unknown;
    ollamaLog: unknown[];
  };

  let history: TurnEntry[] = $state([]);
  let loading = $state(false);
  let error = $state('');

  async function submitTurn() {
    loading = true;
    error = '';

    const payload: Record<string, unknown> = {
      phase,
      phaseAttempts,
      userMessage: userMessage.trim(),
      personality,
    };
    if (trainerName.trim())   payload.trainerName = trainerName.trim();
    if (selectedSport.trim()) payload.selectedSport = selectedSport.trim();
    if (lastAssistantMessage.trim()) payload.lastAssistantMessage = lastAssistantMessage.trim();

    profileJsonError = '';
    try {
      const parsed = JSON.parse(currentUserProfileJson || '{}');
      if (parsed && typeof parsed === 'object') payload.currentUserProfile = parsed;
    } catch {
      profileJsonError = 'invalid JSON in currentUserProfile — sending without it';
    }

    try {
      const res = await fetch('http://localhost:3000/debug/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        error = `${res.status} — ${(body as any).message ?? res.statusText}`;
        return;
      }

      const result = await res.json() as {
        assistantMessage: string;
        nextPhase: string;
        phaseComplete: boolean;
        updatedUserProfile: unknown;
        ollamaLog: unknown[];
      };

      history = [
        {
          userMessage: userMessage.trim(),
          assistantMessage: result.assistantMessage,
          nextPhase: result.nextPhase,
          phaseComplete: result.phaseComplete,
          phaseAttemptsBefore: phaseAttempts,
          updatedUserProfile: result.updatedUserProfile,
          ollamaLog: result.ollamaLog ?? [],
        },
        ...history,
      ];

      // Carry state forward for the next turn
      lastAssistantMessage = result.assistantMessage;
      const prevPhase = phase;
      phase = result.nextPhase;
      phaseAttempts = result.nextPhase !== prevPhase ? 0 : phaseAttempts + 1;
      if (result.updatedUserProfile) {
        currentUserProfileJson = JSON.stringify(result.updatedUserProfile, null, 2);
      }
      userMessage = '';
    } catch (e) {
      error = String(e);
    } finally {
      loading = false;
    }
  }

  function reset() {
    history = [];
    phase = 'basicInfo';
    phaseAttempts = 0;
    userMessage = '';
    lastAssistantMessage = '';
    currentUserProfileJson = '{}';
    profileJsonError = '';
    error = '';
  }
</script>

<h2>debug / turn</h2>

<div style="display:flex; gap:2rem; align-items:flex-start; flex-wrap:wrap;">

  <!-- ── left panel: inputs ── -->
  <div style="display:flex; flex-direction:column; gap:0.5rem; min-width:320px;">

    <label>
      phase
      <select bind:value={phase}>
        {#each PHASES as p}
          <option value={p.value}>{p.label}</option>
        {/each}
      </select>
    </label>

    <label>
      phaseAttempts
      <input type="number" bind:value={phaseAttempts} min="0" style="width:5rem;" />
    </label>

    <label>
      trainerName
      <input bind:value={trainerName} placeholder="optional" />
    </label>

    <label>
      personality
      <input bind:value={personality} />
    </label>

    <label>
      selectedSport
      <input bind:value={selectedSport} placeholder="optional" />
    </label>

    <label>
      lastAssistantMessage <small>(auto-filled after first turn)</small>
      <textarea bind:value={lastAssistantMessage} rows="3" style="width:100%;"></textarea>
    </label>

    <label>
      currentUserProfile <small>(JSON — auto-updated after each turn)</small>
      <textarea bind:value={currentUserProfileJson} rows="6" style="width:100%; font-family:monospace; font-size:0.8rem;"></textarea>
    </label>
    {#if profileJsonError}<p style="color:orange; margin:0;">{profileJsonError}</p>{/if}

    <label>
      userMessage
      <textarea bind:value={userMessage} rows="3" style="width:100%;"
        onkeydown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitTurn(); } }}
      ></textarea>
    </label>

    <div style="display:flex; gap:0.5rem;">
      <button onclick={submitTurn} disabled={loading}>
        {loading ? 'thinking…' : 'send (↵)'}
      </button>
      <button onclick={reset}>reset</button>
    </div>

    {#if error}
      <p style="color:red;">{error}</p>
    {/if}

  </div>

  <!-- ── right panel: history ── -->
  <div style="flex:1; min-width:320px;">
    {#if history.length === 0}
      <p style="color:#888;">no turns yet</p>
    {/if}

    {#each history as entry, i}
      <details open={i === 0} style="margin-bottom:1rem; border:1px solid #ccc; padding:0.75rem;">
        <summary style="cursor:pointer; font-weight:bold;">
          turn {history.length - i} &nbsp;·&nbsp;
          {entry.nextPhase}{entry.phaseComplete ? ' ✓ complete' : ''}
        </summary>

        <p><strong>you:</strong> {entry.userMessage}</p>
        <p><strong>assistant:</strong> {entry.assistantMessage}</p>

        <small>
          phase before: attempt {entry.phaseAttemptsBefore} →
          next: <code>{entry.nextPhase}</code>
          {entry.phaseComplete ? '(phase complete)' : ''}
        </small>

        {#if entry.updatedUserProfile}
          <details style="margin-top:0.5rem;">
            <summary>updatedUserProfile</summary>
            <pre style="font-size:0.75rem; overflow:auto; max-height:300px;">{JSON.stringify(entry.updatedUserProfile, null, 2)}</pre>
          </details>
        {/if}

        {#if entry.ollamaLog.length > 0}
          <details style="margin-top:0.5rem;">
            <summary>ollama log ({entry.ollamaLog.length})</summary>
            <pre style="font-size:0.75rem; overflow:auto; max-height:300px;">{JSON.stringify(entry.ollamaLog, null, 2)}</pre>
          </details>
        {/if}
      </details>
    {/each}
  </div>

</div>
