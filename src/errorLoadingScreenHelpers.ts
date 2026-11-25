export const guessProblem = (errorMessage: string) => {
  if (errorMessage.endsWith('Socket error: ECONNREFUSED')) {
    return 'Most probably the server is not running.'
  }
  // a script chunk of an older build is gone from the server (new release deployed while this page was open)
  if (/chunkloaderror|loading (css )?chunk \S+ failed|failed to fetch dynamically imported module|importing a module script failed/i.test(errorMessage)) {
    return 'The game was updated while this page was open: reload the page.'
  }
}

export const loadingTexts = [
  'Like the project? Give us a star on GitHub or rate us on AlternativeTo!',
  'To stay updated with the latest changes, go to the GitHub page, click on "Watch", choose "Custom", and then opt for "Releases"!',
  'Upvote features on GitHub issues to help us prioritize them!',
  'Want to contribute to the project? Check out Contributing.md on GitHub!',
]
