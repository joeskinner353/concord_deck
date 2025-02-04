export const siteStructure = {
    catalogue: {
        title: 'Catalogue Overview',
        sections: {
            pop: {
                title: 'Pop',
                description: 'Pop catalogue description will go here...',
                discoPlaylist: 'https://open.spotify.com/playlist/example-pop'
            },
            boosey: {
                title: 'Boosey & Hawkes',
                description: "Boosey & Hawkes is the world's leading classical music publisher, representing an iconic catalog of composers, including Stravinsky, Britten, Bernstein, and Adams. With a rich history dating back to 1930, the company has been at the forefront of contemporary classical music, providing licensing, sheet music, and performance materials to musicians, orchestras, and film/TV productions worldwide.",
                discoPlaylist: 'https://open.spotify.com/playlist/example-boosey',
                discoPlaylistEmbed: '<iframe id="disco-playlist-8620530" name="disco-playlist-8620530" allowfullscreen frameborder="0" class="disco-embed" src="https://concord-music-publishing.disco.ac/e/p/8620530?download=true&territory_ids=%5B2877086%5D&s=OngI-X4-rRS-9osnPS1XKRK4BmI%3AqRfE99t2&artwork=true&color=%2332B57C&theme=white" width="480" height="395"></iframe>'
            },
            rh: {
                title: 'Rodgers and Hammerstein',
                description: 'Rodgers and Hammerstein catalogue description will go here...',
                discoPlaylist: 'https://open.spotify.com/playlist/example-rh'
            },
            fania: {
                title: 'Fania',
                description: 'Fania catalogue description will go here...',
                discoPlaylist: 'https://open.spotify.com/playlist/example-fania'
            }
        }
    },
    bespoke: {
        title: 'Bespoke Roster',
        sections: {
            composer1: {
                title: 'Maestro',
                image: './assets/maestro.png',
                discoPlaylist: 'https://open.spotify.com/playlist/example1',
                bio: "Grammy Award winning London based producer/writer Maestro ('TheBaker') prides himself on his versatile abilities. With accolades spanning genres, in his Grammy award for 'Rihanna's' 'unapologetic' album, which was also awarded billboard number 1, to numerous Uk number one albums with Jhus, and world-wide number one album with Kpop supergroup 'Twice'. Alongside Brit awards, and Mercury prize nominations, maestro has become a well decorated producer.",
                videos: [
                    {
                        type: "youtube",
                        id: "6p8GnWgK5Cs",
                        title: "Qatar Airways",
                        thumbnail: "https://img.youtube.com/vi/6p8GnWgK5Cs/maxresdefault.jpg"
                    },
                    {
                        type: "vimeo",
                        id: "969887901",
                        title: "DISNEY X BALMAIN",
                        thumbnail: "https://i.vimeocdn.com/video/969887901_640.jpg"
                    },
                    {
                        type: "vimeo",
                        id: "780328847",
                        title: "Intel",
                        thumbnail: "https://i.vimeocdn.com/video/780328847_640.jpg"
                    },
                    {
                        type: "vimeo",
                        id: "730565999",
                        title: "Baileys",
                        thumbnail: "https://i.vimeocdn.com/video/730565999_640.jpg"
                    }
                ],
                social: {
                    instagram: "https://www.instagram.com/maestrothebaker/",
                    spotify: "https://open.spotify.com/playlist/6PyP32T4tLCtCSKuhn4xYI?si=21b8d68df89a4476",
                    tiktok: "https://tiktok.com/@maestro"
                }
            },
            composer2: {
                title: 'James Greenwood',
                image: './assets/placeholder.png',
                discoPlaylist: 'https://open.spotify.com/playlist/example2',
                bio: 'Content coming soon...',
                social: {
                    instagram: "https://instagram.com/jamesgreenwood",
                    spotify: "https://open.spotify.com/artist/jamesgreenwood",
                    tiktok: "https://tiktok.com/@jamesgreenwood"
                }
            },
            composer3: {
                title: 'Ben Garrett',
                image: './assets/placeholder.png',
                discoPlaylist: 'https://open.spotify.com/playlist/example3',
                bio: 'Content coming soon...'
            },
            composer4: {
                title: 'Kurisu',
                image: './assets/placeholder.png',
                discoPlaylist: 'https://open.spotify.com/playlist/example4',
                bio: 'Content coming soon...'
            },
            composer5: {
                title: 'Tre Jean-Marie',
                image: './assets/placeholder.png',
                discoPlaylist: 'https://open.spotify.com/playlist/example5',
                bio: 'Content coming soon...'
            }
        }
    },
    ftv: {
        title: 'FTV',
        sections: {
            overview: {
                title: 'FTV Overview',
                content: 'Overview of our Film & TV services...'
            },
            examples: {
                title: 'Examples from Film & TV',
                video: '/assets/ftv-showreel.mp4',
                content: 'Showcase of our work...'
            },
            advertising: {
                title: 'Advertising Model',
                content: 'Our advertising services and model...'
            }
        }
    }
}; 