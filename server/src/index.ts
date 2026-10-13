// Un type explicite sur le paramètre : c'est la base de TypeScript.
// Doc : https://www.typescriptlang.org/docs/handbook/2/everyday-types.html
function saluer(nom: string): string {
  return `Bienvenue dans Hivetown, ${nom} !`;
}

// console.log : https://developer.mozilla.org/fr/docs/Web/API/console/log_static
console.log(saluer("Ernest"));