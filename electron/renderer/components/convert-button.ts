const setConvertButtonState = (btn: HTMLButtonElement, enabled: boolean): void => {
  btn.disabled = !enabled
}

export default setConvertButtonState
