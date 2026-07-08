let dirty = false

export function setUnsavedChanges(value: boolean) {
  dirty = value
}

export function hasUnsavedChanges() {
  return dirty
}
