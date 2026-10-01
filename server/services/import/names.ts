export type PersonName = { firstName: string; lastName: string };

const MAX_PART = 50;

function clean(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

// "Reyes, Ana Marie" -> last "Reyes", first "Ana Marie"
// "Ana Marie Reyes"  -> last "Reyes", first "Ana Marie"
// "Madonna"          -> last "Madonna", first "Madonna" (one word is used for both)
export function splitName(fullName: string): PersonName | null {
  const text = clean(fullName);
  if (text === "") return null;

  let firstName: string;
  let lastName: string;
  const comma = text.indexOf(",");
  if (comma >= 0) {
    lastName = clean(text.slice(0, comma));
    firstName = clean(text.slice(comma + 1));
  } else {
    const lastSpace = text.lastIndexOf(" ");
    if (lastSpace < 0) {
      firstName = text;
      lastName = text;
    } else {
      firstName = text.slice(0, lastSpace);
      lastName = text.slice(lastSpace + 1);
    }
  }

  if (lastName === "" || firstName === "") return null;
  return { firstName: firstName.slice(0, MAX_PART), lastName: lastName.slice(0, MAX_PART) };
}
