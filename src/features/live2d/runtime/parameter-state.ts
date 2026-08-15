export interface ParameterStore<Id> {
  getParameterValueById(id: Id): number;
  setParameterValueById(id: Id, value: number): void;
  saveParameters(): void;
}

export interface ParameterValue<Id> {
  id: Id;
  value: number;
}

export function readParameterValues<Id>(store: ParameterStore<Id>, ids: readonly Id[]): ParameterValue<Id>[] {
  return ids.map((id) => ({ id, value: store.getParameterValueById(id) }));
}

/**
 * Saves the current model state without persisting changes to transient
 * parameters, while retaining those changes for the frame being rendered.
 */
export function saveParametersWithTransientState<Id>(
  store: ParameterStore<Id>,
  transientBaseline: readonly ParameterValue<Id>[],
): void {
  const renderedValues = transientBaseline.map(({ id }) => ({ id, value: store.getParameterValueById(id) }));

  try {
    for (const { id, value } of transientBaseline) store.setParameterValueById(id, value);
    store.saveParameters();
  } finally {
    for (const { id, value } of renderedValues) store.setParameterValueById(id, value);
  }
}
