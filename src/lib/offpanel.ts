/** Off panel (after the weekly strip): the stickers and the list. DRAFT captions written from the photos themselves; correct them
 *  freely. `src` is the file stem in src/assets/offpanel (photos) or public/offpanel (clips, .mp4 + .jpg poster).
 *  `x`/`y` are percentages of the board, `r` the tilt in degrees; `w` is the sticker width in rem on desktop. */
export type Sticker = { src: string; kind: "photo" | "clip"; caption: string; alt: string; x: number; y: number; r: number; w: number };
export const stickers: Sticker[] = [
  { src: "05-kanyakumari", kind: "photo", caption: "land’s end, Kanyakumari", alt: "Silhouette on the beach at Kanyakumari with the Thiruvalluvar statue behind", x: 2.0, y: 0, r: -3, w: 10 },
  { src: "13-rafting", kind: "photo", caption: "white water", alt: "A raft full of people in helmets going through rapids", x: 21.2, y: 0, r: 2, w: 10 },
  { src: "02-jenga", kind: "clip", caption: "jenga, decisive", alt: "Pulling a block from a Jenga tower", x: 40.4, y: 0, r: -2, w: 8.125 },
  { src: "11-startup-thiruvizha", kind: "photo", caption: "Startup Thiruvizha, Madurai", alt: "Standing at the Startup Thiruvizha Madurai edition entrance", x: 54.0, y: 0, r: 2.5, w: 10 },
  { src: "16-veshti", kind: "photo", caption: "veshti day", alt: "In a red shirt and white veshti", x: 73.2, y: 0, r: -2, w: 8.125 },
  { src: "08-the-hills", kind: "clip", caption: "the hills", alt: "A green valley seen from a hill trail", x: 2.0, y: 25, r: 1.5, w: 8.125 },
  { src: "07-zorb", kind: "photo", caption: "zorbing, briefly upright", alt: "Two people inside a water zorb", x: 15.6, y: 25, r: -1.5, w: 10 },
  { src: "12-train-gang", kind: "photo", caption: "the gang, in transit", alt: "Group selfie on a train", x: 34.8, y: 25, r: 2, w: 10 },
  { src: "04-microsoft", kind: "photo", caption: "a wall worth a photo", alt: "Standing under a Microsoft logo on a concrete wall", x: 54.0, y: 25, r: -2.5, w: 10 },
  { src: "15-stadium", kind: "photo", caption: "match day", alt: "In the stands of a stadium in a Levi's t-shirt", x: 73.2, y: 25, r: 1, w: 10 },
  { src: "06-sun-through-trees", kind: "clip", caption: "sun through the trees", alt: "The sun seen through forest trees", x: 2.0, y: 50, r: -1, w: 8.125 },
  { src: "01-night-out", kind: "photo", caption: "night out", alt: "On a street at night under string lights", x: 29.2, y: 50, r: -2, w: 8.125 },
  { src: "09-sea-sunset", kind: "photo", caption: "sunset, no plan", alt: "Sunset over the sea from a cliff", x: 42.8, y: 50, r: 1.5, w: 10 },
  { src: "18-rafting-above", kind: "photo", caption: "rafting, from above", alt: "A raft seen from above on blue water", x: 62.0, y: 50, r: -1, w: 10 },
  { src: "10-trail", kind: "clip", caption: "the trail", alt: "Walking on a dusty trail, looking down at shoes", x: 12.0, y: 75, r: 2.5, w: 8.125 },
  { src: "14-on-the-rocks", kind: "photo", caption: "on the rocks", alt: "Silhouette standing on a rock by the sea", x: 25.6, y: 75, r: -2, w: 10 },
  { src: "19-garland", kind: "photo", caption: "garlanded", alt: "Wearing a tinsel garland at a celebration", x: 44.8, y: 75, r: 1, w: 10 },
  { src: "03-vintage-taxi", kind: "photo", caption: "the yellow-top taxi", alt: "A vintage black-and-yellow taxi on display", x: 64.0, y: 75, r: 2, w: 10 },
  { src: "20-mall", kind: "photo", caption: "posing, obviously", alt: "Leaning on a railing in a mall", x: 15.6, y: 50, r: 2, w: 8.125 },
];
/** DRAFT, written from the photos; replace with your own words. One line each, in first person. */
export const loves: { icon: "raft" | "boots" | "ball" | "mic" | "camera" | "sun" | "friends"; text: string }[] = [
  { icon: "raft", text: "Rafting. Cold water, a loud boat, and nobody checking their phone." },
  { icon: "boots", text: "Trekking. The hills around Tamil Nadu, one trail at a time." },
  { icon: "ball", text: "Match days. A stadium seat beats any screen." },
  { icon: "mic", text: "Startup events. Madurai in 2024 was the loud one." },
  { icon: "sun", text: "Sunsets by the sea, from Kanyakumari to the next rock along." },
  { icon: "friends", text: "The gang. Trains, rafts, zorbs, whatever moves." },
  { icon: "camera", text: "Photos of all of it. I document far more than anyone asked for." },
];
