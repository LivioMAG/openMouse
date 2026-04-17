const state = {
  score: 0,
  view: 'dashboard',
  builder: {
    slots: {
      1: null,
      2: null,
      3: null,
      4: null,
      5: null,
    },
    completed: false,
  },
  schema0: {
    switchOn: false,
    sawOn: false,
    sawOffAfterOn: false,
    completed: false,
  },
  schema3: {
    a: false,
    b: false,
    sawOn: false,
    sawOffAfterOn: false,
    completed: false,
  },
  schema6: {
    a: false,
    b: false,
    c: false,
    targetLampOn: true,
    reachedTarget: false,
    completed: false,
  },
};

const panels = {
  dashboard: document.getElementById('dashboard'),
  builder: document.getElementById('exercise-builder'),
  schema0: document.getElementById('exercise-schema0'),
  schema3: document.getElementById('exercise-schema3'),
  schema6: document.getElementById('exercise-schema6'),
};

const scoreEl = document.getElementById('totalScore');

const schema0Els = {
  task: document.getElementById('schema0Task'),
  switch: document.getElementById('schema0Switch'),
  lamp: document.getElementById('schema0Lamp'),
  feedback: document.getElementById('schema0Feedback'),
  reset: document.getElementById('schema0Reset'),
};

const builderEls = {
  task: document.getElementById('builderTask'),
  parts: Array.from(document.querySelectorAll('.part')),
  slots: Array.from(document.querySelectorAll('.slot')),
  check: document.getElementById('builderCheck'),
  reset: document.getElementById('builderReset'),
  feedback: document.getElementById('builderFeedback'),
};

const schema3Els = {
  task: document.getElementById('schema3Task'),
  switchA: document.getElementById('schema3SwitchA'),
  switchB: document.getElementById('schema3SwitchB'),
  lamp: document.getElementById('schema3Lamp'),
  feedback: document.getElementById('schema3Feedback'),
  reset: document.getElementById('schema3Reset'),
};

const schema6Els = {
  task: document.getElementById('schema6Task'),
  switchA: document.getElementById('schema6SwitchA'),
  switchB: document.getElementById('schema6SwitchB'),
  switchC: document.getElementById('schema6SwitchC'),
  lamp: document.getElementById('schema6Lamp'),
  feedback: document.getElementById('schema6Feedback'),
  reset: document.getElementById('schema6Reset'),
};

const setView = (view) => {
  state.view = view;
  Object.entries(panels).forEach(([key, panel]) => {
    panel.classList.toggle('active', key === view);
  });
};

const updateScore = () => {
  scoreEl.textContent = `${state.score} Punkte`;
};

const updateLamp = (lampElement, lampOn) => {
  lampElement.classList.toggle('on', lampOn);
  lampElement.textContent = lampOn ? 'AN' : 'AUS';
};

const markSuccess = (feedbackElement, text) => {
  feedbackElement.textContent = text;
  feedbackElement.classList.add('success');
};

const setHint = (feedbackElement, text) => {
  feedbackElement.textContent = text;
  feedbackElement.classList.remove('success');
};

const getSchema3LampOn = () => state.schema3.a !== state.schema3.b;
const getSchema6LampOn = () => Number(state.schema6.a) + Number(state.schema6.b) + Number(state.schema6.c) >= 2;

const renderBuilder = () => {
  builderEls.task.textContent = state.builder.completed
    ? 'Geschafft! Die Schaltung ist korrekt aufgebaut und der Stromkreis ist geschlossen.'
    : 'Aufgabe: Ziehe alle Bauteile in der richtigen Reihenfolge in den Schaltungsplatz.';

  builderEls.slots.forEach((slot) => {
    const slotNumber = slot.dataset.slot;
    const currentPart = state.builder.slots[slotNumber];
    const expectedPart = slot.dataset.accept;
    slot.classList.toggle('filled', Boolean(currentPart));
    slot.textContent = currentPart
      ? `${slotNumber}. ${builderEls.parts.find((part) => part.dataset.part === currentPart)?.textContent ?? ''}`
      : `${slotNumber}. ${
          expectedPart === 'battery'
            ? 'Energiequelle'
            : expectedPart.includes('wire')
              ? 'Leitung'
              : expectedPart === 'switch'
                ? 'Schalter'
                : 'Verbraucher'
        }`;
  });

  const usedParts = new Set(Object.values(state.builder.slots).filter(Boolean));
  builderEls.parts.forEach((part) => {
    const isUsed = usedParts.has(part.dataset.part);
    part.classList.toggle('used', isUsed);
    part.setAttribute('aria-disabled', String(isUsed));
  });
};

const renderSchema0 = () => {
  const { switchOn, completed } = state.schema0;

  schema0Els.task.textContent = completed
    ? 'Geschafft! Du hast die Lampe mit einem Schalter ein- und ausgeschaltet.'
    : 'Aufgabe: Schalte die Lampe zuerst EIN und danach wieder AUS.';

  schema0Els.switch.textContent = switchOn ? 'Schalter: EIN' : 'Schalter: AUS';
  schema0Els.switch.classList.toggle('on', switchOn);
  updateLamp(schema0Els.lamp, switchOn);
};

const renderSchema3 = () => {
  const completed = state.schema3.completed;
  const lampOn = getSchema3LampOn();

  schema3Els.task.textContent = completed
    ? 'Top! Du hast gezeigt, dass zwei Schalter eine Lampe steuern können.'
    : 'Aufgabe: Nutze beide Schalter mindestens einmal, bringe die Lampe EIN und danach wieder AUS.';

  schema3Els.switchA.textContent = `Schalter A: ${state.schema3.a ? 'oben' : 'unten'}`;
  schema3Els.switchB.textContent = `Schalter B: ${state.schema3.b ? 'oben' : 'unten'}`;
  schema3Els.switchA.classList.toggle('on', state.schema3.a);
  schema3Els.switchB.classList.toggle('on', state.schema3.b);
  updateLamp(schema3Els.lamp, lampOn);
};

const renderSchema6 = () => {
  const completed = state.schema6.completed;
  const lampOn = getSchema6LampOn();
  const targetText = state.schema6.targetLampOn ? 'AN' : 'AUS';

  schema6Els.task.textContent = completed
    ? 'Super! Du hast die Mehrfachschaltung gemeistert.'
    : `Aufgabe: Bringe die Lampe zuerst auf ${targetText}. Danach schalte sie auf ${
        state.schema6.targetLampOn ? 'AUS' : 'AN'
      }.`;

  schema6Els.switchA.textContent = `Schalter A: ${state.schema6.a ? '1' : '0'}`;
  schema6Els.switchB.textContent = `Schalter B: ${state.schema6.b ? '1' : '0'}`;
  schema6Els.switchC.textContent = `Schalter C: ${state.schema6.c ? '1' : '0'}`;
  schema6Els.switchA.classList.toggle('on', state.schema6.a);
  schema6Els.switchB.classList.toggle('on', state.schema6.b);
  schema6Els.switchC.classList.toggle('on', state.schema6.c);
  updateLamp(schema6Els.lamp, lampOn);
};

const render = () => {
  updateScore();
  renderBuilder();
  renderSchema0();
  renderSchema3();
  renderSchema6();
};

const completeChallenge = (schemaKey, feedbackElement, successText, points) => {
  if (state[schemaKey].completed) return;
  state[schemaKey].completed = true;
  state.score += points;
  markSuccess(feedbackElement, `${successText} (+${points} Punkte)`);
  render();
};

const resetSchema0 = () => {
  state.schema0.switchOn = false;
  state.schema0.sawOn = false;
  state.schema0.sawOffAfterOn = false;
  state.schema0.completed = false;
  setHint(schema0Els.feedback, 'Tipp: Ein Schalter steuert direkt den Stromfluss zur Lampe.');
  render();
};

const resetBuilder = () => {
  state.builder.slots = {
    1: null,
    2: null,
    3: null,
    4: null,
    5: null,
  };
  state.builder.completed = false;
  setHint(
    builderEls.feedback,
    'Tipp: Ein geschlossener Kreis braucht Batterie, Leitungen, Schalter und Lampe in korrekter Reihenfolge.'
  );
  render();
};

const resetSchema3 = () => {
  state.schema3.a = false;
  state.schema3.b = false;
  state.schema3.sawOn = false;
  state.schema3.sawOffAfterOn = false;
  state.schema3.completed = false;
  setHint(schema3Els.feedback, 'Tipp: In der Wechselschaltung kann jeder Schalter den Zustand wechseln.');
  render();
};

const checkBuilder = () => {
  const isCorrect = builderEls.slots.every((slot) => {
    const slotNumber = slot.dataset.slot;
    return state.builder.slots[slotNumber] === slot.dataset.accept;
  });

  if (isCorrect) {
    completeChallenge('builder', builderEls.feedback, 'Perfekt aufgebaut!', 15);
    return;
  }

  setHint(builderEls.feedback, 'Noch nicht korrekt: Prüfe Reihenfolge und Vollständigkeit der Bauteile.');
  render();
};

const handlePartDrop = (slot, partKey) => {
  const slotNumber = slot.dataset.slot;
  const alreadyUsed = Object.values(state.builder.slots).includes(partKey);
  if (alreadyUsed) {
    setHint(builderEls.feedback, 'Dieses Bauteil ist bereits gesetzt.');
    return;
  }

  state.builder.slots[slotNumber] = partKey;
  setHint(builderEls.feedback, 'Bauteil platziert. Fülle alle Felder und prüfe den Stromkreis.');
  render();
};

builderEls.parts.forEach((part) => {
  part.addEventListener('dragstart', (event) => {
    if (part.classList.contains('used')) {
      event.preventDefault();
      return;
    }
    part.classList.add('dragging');
    event.dataTransfer?.setData('text/plain', part.dataset.part ?? '');
  });

  part.addEventListener('dragend', () => {
    part.classList.remove('dragging');
  });
});

builderEls.slots.forEach((slot) => {
  slot.addEventListener('dragover', (event) => {
    event.preventDefault();
    slot.classList.add('ready');
  });

  slot.addEventListener('dragleave', () => {
    slot.classList.remove('ready');
  });

  slot.addEventListener('drop', (event) => {
    event.preventDefault();
    slot.classList.remove('ready');
    const partKey = event.dataTransfer?.getData('text/plain');
    if (!partKey) return;
    handlePartDrop(slot, partKey);
  });

  slot.addEventListener('click', () => {
    const slotNumber = slot.dataset.slot;
    if (!state.builder.slots[slotNumber]) return;
    state.builder.slots[slotNumber] = null;
    setHint(builderEls.feedback, 'Bauteil entfernt. Du kannst es erneut platzieren.');
    render();
  });
});

builderEls.check.addEventListener('click', checkBuilder);
builderEls.reset.addEventListener('click', resetBuilder);

const resetSchema6 = () => {
  state.schema6.a = false;
  state.schema6.b = false;
  state.schema6.c = false;
  state.schema6.targetLampOn = Math.random() > 0.5;
  state.schema6.reachedTarget = false;
  state.schema6.completed = false;
  setHint(
    schema6Els.feedback,
    'Tipp: Beobachte, wie sich die Lampe mit jedem zusätzlichen Schalter verhält.'
  );
  render();
};

schema0Els.switch.addEventListener('click', () => {
  state.schema0.switchOn = !state.schema0.switchOn;

  if (state.schema0.switchOn) {
    state.schema0.sawOn = true;
  }

  if (!state.schema0.switchOn && state.schema0.sawOn) {
    state.schema0.sawOffAfterOn = true;
  }

  if (state.schema0.sawOn && state.schema0.sawOffAfterOn) {
    completeChallenge('schema0', schema0Els.feedback, 'Aufgabe gelöst!', 10);
  } else {
    setHint(schema0Els.feedback, 'Gut! Beobachte, wann die Lampe leuchtet und wann nicht.');
    render();
  }
});

schema3Els.switchA.addEventListener('click', () => {
  state.schema3.a = !state.schema3.a;

  const lampOn = getSchema3LampOn();
  if (lampOn) state.schema3.sawOn = true;
  if (!lampOn && state.schema3.sawOn) state.schema3.sawOffAfterOn = true;

  if (state.schema3.sawOn && state.schema3.sawOffAfterOn) {
    completeChallenge('schema3', schema3Els.feedback, 'Stark gelöst!', 20);
  } else {
    setHint(schema3Els.feedback, 'Prima! Wechsle auch den zweiten Schalter und beobachte den Effekt.');
    render();
  }
});

schema3Els.switchB.addEventListener('click', () => {
  state.schema3.b = !state.schema3.b;

  const lampOn = getSchema3LampOn();
  if (lampOn) state.schema3.sawOn = true;
  if (!lampOn && state.schema3.sawOn) state.schema3.sawOffAfterOn = true;

  if (state.schema3.sawOn && state.schema3.sawOffAfterOn) {
    completeChallenge('schema3', schema3Els.feedback, 'Stark gelöst!', 20);
  } else {
    setHint(schema3Els.feedback, 'Prima! Wechsle auch den zweiten Schalter und beobachte den Effekt.');
    render();
  }
});

const toggleSchema6Switch = (key) => {
  state.schema6[key] = !state.schema6[key];
  const lampOn = getSchema6LampOn();

  if (!state.schema6.reachedTarget && lampOn === state.schema6.targetLampOn) {
    state.schema6.reachedTarget = true;
    setHint(schema6Els.feedback, `Sehr gut! Nun die Lampe auf ${state.schema6.targetLampOn ? 'AUS' : 'AN'} schalten.`);
    render();
    return;
  }

  if (state.schema6.reachedTarget && lampOn !== state.schema6.targetLampOn) {
    completeChallenge('schema6', schema6Els.feedback, 'Mehrfachschaltung verstanden!', 30);
    return;
  }

  setHint(schema6Els.feedback, 'Weiterprobieren: Jede Schaltstelle verändert den Gesamtzustand.');
  render();
};

schema6Els.switchA.addEventListener('click', () => toggleSchema6Switch('a'));
schema6Els.switchB.addEventListener('click', () => toggleSchema6Switch('b'));
schema6Els.switchC.addEventListener('click', () => toggleSchema6Switch('c'));

schema0Els.reset.addEventListener('click', resetSchema0);
schema3Els.reset.addEventListener('click', resetSchema3);
schema6Els.reset.addEventListener('click', resetSchema6);

document.querySelectorAll('[data-open-exercise]').forEach((button) => {
  button.addEventListener('click', () => {
    setView(button.dataset.openExercise);
  });
});

document.querySelectorAll('[data-back]').forEach((button) => {
  button.addEventListener('click', () => {
    setView('dashboard');
  });
});

resetSchema0();
resetSchema3();
resetSchema6();
resetBuilder();
setView('dashboard');
render();
