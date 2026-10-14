export const urlParams = new URLSearchParams(window.location.search)
export const isPlayground = urlParams.get('playground') === 'true' || urlParams.get('playground') === '1'

if (isPlayground) {
  // hide #ui-root
  const uiRoot = document.getElementById('ui-root')
  if (uiRoot) {
    uiRoot.style.display = 'none'
  }
}
