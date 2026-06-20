export const guessProblem = (errorMessage: string) => {
  if (errorMessage.endsWith('Socket error: ECONNREFUSED')) {
    return 'Most probably the server is not running.'
  }
}

export const loadingTexts = [
  'Like the project? Give us a star on GitHub or rate us on AlternativeTo!',
  'To stay updated with the latest changes, go to the GitHub page, click on "Watch", choose "Custom", and then opt for "Releases"!',
  'Upvote features on GitHub issues to help us prioritize them!',
  'Want to contribute to the project? Check out Contributing.md on GitHub!'
]
