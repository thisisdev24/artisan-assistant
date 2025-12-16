export const NavbarMenu = [
  {
    id: 1,
    title: "Home",
    link: "/",
  },
  {
    id: 2,
    title: "Products",
    link: "/ShowListingPublic",
    children: [
      {
        title: "Paintings",
        link: "/search?query=paintings",
      },
      {
        title: "Handicrafts",
        link: "/search?query=handicrafts",
      }
    ]
  },
  {
    id: 3,
    title: "Artists",
    link: "/artists",
  },
  // {
  //   id: 4,
  //   title: "Shorts",
  //   link: "/shorts",
  // },
  {
    id: 5,
    title: "Contact",
    link: "/contact",
  },
];

export const SearchBar = [
  {
    id: 1,
    title: "Go",
    link: "/SearchResults"
  },
];