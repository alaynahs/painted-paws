export type CoatLength = "short" | "long";

export interface BreedEntry {
  name: string;
  coat: CoatLength;
  group: string;
  isDoodle?: boolean;
}

const SHORT_SMALL_MEDIUM = [
  "Basenji", "Beagle", "Boston Terrier", "Boxer",
  "Bull Terrier (Miniature & Standard)", "Chihuahua (Smooth-haired)",
  "Dachshund (Smooth)", "French Bulldog", "Italian Greyhound",
  "Manchester Terrier", "Miniature Pinscher", "Pug", "Rat Terrier", "Whippet",
];

const SHORT_LARGE_GIANT = [
  "American Staffordshire Terrier", "American Pit Bull Terrier",
  "Pit Bull", "Anatolian Shepherd",
  "Black Russian Terrier", "Bloodhound", "Boerboel", "Bullmastiff",
  "Cane Corso", "Catahoula Leopard Dog", "Doberman Pinscher",
  "Dogue de Bordeaux", "Fila Brasileiro", "Great Dane", "Greyhound",
  "Mastiff", "Pharaoh Hound", "Plott Hound", "Pointer",
  "Rhodesian Ridgeback", "Rottweiler", "Sloughi", "Weimaraner",
  "Xoloitzcuintli",
];

const LONG_DOODLES_POODLES = [
  "Aussiedoodle", "Bernedoodle", "Cavapoo", "Cockapoo", "Goldendoodle",
  "Labradoodle", "Poodle (Toy)", "Poodle (Miniature)", "Poodle (Standard)",
  "Portuguese Water Dog", "Spanish Water Dog",
];

const LONG_SILKY_DROP = [
  "Afghan Hound", "Cavalier King Charles Spaniel", "Cavachon",
  "Chihuahua (Long-haired)", "Chinese Crested (Powderpuff)",
  "Coton de Tulear", "Dachshund (Long-haired)", "Havanese", "Japanese Chin",
  "Lhasa Apso", "Maltese", "Papillon", "Pekingese", "Shih Tzu",
  "Silky Terrier", "Tibetan Spaniel", "Yorkshire Terrier",
];

const LONG_HEAVY_DOUBLE = [
  "Akita", "Alaskan Malamute", "American Eskimo", "Australian Cattle Dog",
  "Australian Shepherd (including Miniature)", "Bearded Collie",
  "Beauceron", "Belgian Malinois", "Belgian Sheepdog", "Belgian Tervuren",
  "Bernese Mountain Dog", "Border Collie", "Cardigan Welsh Corgi",
  "Pembroke Welsh Corgi", "Chow Chow", "Collie (Rough & Smooth)",
  "Finnish Lapphund", "Finnish Spitz", "German Shepherd",
  "Golden Retriever", "Great Pyrenees", "Greater Swiss Mountain Dog",
  "Keeshond", "Kuvasz", "Labrador Retriever", "Leonberger", "Newfoundland",
  "Norwegian Elkhound", "Norwegian Lundehund",
  "Nova Scotia Duck Tolling Retriever", "Old English Sheepdog",
  "Pomeranian", "Puli", "Pumi", "Samoyed", "Schipperke",
  "Shetland Sheepdog (Sheltie)", "Shiba Inu", "Siberian Husky",
  "Tibetan Mastiff",
];

const LONG_WIRE = [
  "Affenpinscher", "Airedale Terrier", "Australian Terrier",
  "Bedlington Terrier", "Bergamasco", "Border Terrier",
  "Bouvier des Flandres", "Boykin Spaniel", "Briard", "Brittany",
  "Brussels Griffon", "Cairn Terrier", "Cesky Terrier",
  "Chesapeake Bay Retriever", "Clumber Spaniel", "Coonhound",
  "Curly-Coated Retriever", "Dachshund (Wirehaired)", "Dalmatian",
  "Dandie Dinmont Terrier", "English Setter", "English Toy Spaniel",
  "Field Spaniel", "Flat-Coated Retriever", "Fox Terrier (Smooth & Wire)",
  "German Shorthaired Pointer", "German Wirehaired Pointer",
  "Giant Schnauzer", "Glen of Imaal Terrier", "Gordon Setter", "Harrier",
  "Ibizan Hound", "Irish Setter", "Irish Terrier", "Irish Water Spaniel",
  "Irish Wolfhound", "Jack Russell Terrier", "Kerry Blue Terrier",
  "Komondor", "Lakeland Terrier", "Lowchen", "Miniature Schnauzer",
  "Norfolk Terrier", "Norwich Terrier", "Otterhound",
  "Parson Russell Terrier", "Petit Basset Griffon Vendéen",
  "Russell Terrier", "Saluki", "Scottish Deerhound", "Scottish Terrier",
  "Sealyham Terrier", "Soft Coated Wheaten Terrier", "Spinone Italiano",
  "Standard Schnauzer", "Sussex Spaniel", "Tibetan Terrier",
  "Toy Fox Terrier", "Treeing Walker Coonhound", "Vizsla",
  "Welsh Springer Spaniel", "Welsh Terrier",
  "West Highland White Terrier (Westie)", "Wirehaired Pointing Griffon",
  "Wirehaired Vizsla",
];

function toEntries(
  names: string[],
  coat: CoatLength,
  group: string,
  isDoodle = false,
): BreedEntry[] {
  return names.map((name) => ({ name, coat, group, isDoodle }));
}

export const DOG_BREEDS: BreedEntry[] = [
  ...toEntries(SHORT_SMALL_MEDIUM, "short", "Short & Smooth-Coated (Small/Medium)"),
  ...toEntries(SHORT_LARGE_GIANT, "short", "Short & Smooth-Coated (Large/Giant)"),
  ...toEntries(LONG_DOODLES_POODLES, "long", "Doodles & Poodles", true),
  ...toEntries(LONG_SILKY_DROP, "long", "Long Silky / Drop Coats"),
  ...toEntries(LONG_HEAVY_DOUBLE, "long", "Heavy Double-Coated"),
  ...toEntries(LONG_WIRE, "long", "Wire Coats & Furnishings"),
].sort((a, b) => a.name.localeCompare(b.name));

export function findBreed(name: string): BreedEntry | undefined {
  return DOG_BREEDS.find((b) => b.name === name);
}

export interface CatBreedEntry {
  name: string;
  coat: CoatLength;
}

const CAT_BREED_ENTRIES: CatBreedEntry[] = [
  { name: "Domestic Shorthair", coat: "short" },
  { name: "Domestic Longhair", coat: "long" },
  { name: "Siamese", coat: "short" },
  { name: "Persian", coat: "long" },
  { name: "Maine Coon", coat: "long" },
  { name: "Ragdoll", coat: "long" },
  { name: "British Shorthair", coat: "short" },
  { name: "Sphynx", coat: "short" },
  { name: "Bengal", coat: "short" },
  { name: "Himalayan", coat: "long" },
];

export const CAT_BREEDS: CatBreedEntry[] = [...CAT_BREED_ENTRIES].sort((a, b) =>
  a.name.localeCompare(b.name),
);

export function findCatBreed(name: string): CatBreedEntry | undefined {
  return CAT_BREEDS.find((b) => b.name === name);
}
