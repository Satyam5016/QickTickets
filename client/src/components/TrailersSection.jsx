import React, { useState } from 'react'
import ReactPlayer from 'react-player'
import BlurCircle from './BlurCircle'
import { dummyTrailers } from '../assets/assets'
import { PlayCircleIcon } from 'lucide-react'

const TrailersSection = () => {
    const [currentTrailer, setCurrentTrailer] = useState(dummyTrailers[0])

    return (
        <section className='px-6 md:px-16 lg:px-36 py-20 overflow-hidden'>
            <div className='mx-auto max-w-5xl'>
            <p className='mb-2 text-sm font-semibold uppercase tracking-[0.22em] text-primary'>Watch first</p>
            <h2 className='text-3xl font-bold md:text-4xl'>Featured Trailers</h2>

            {/* Center the video */}
            <div className='relative mt-8 flex justify-center items-center overflow-hidden rounded-lg border border-white/10 bg-white/5'>
                <BlurCircle top='-100px' right='-100px' />
                <div className='aspect-video w-full'>
                    <ReactPlayer src={currentTrailer.videoUrl} controls width="100%" height="100%" />
                </div>
            </div>

            <div className='group grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-5 mt-6'>
                {dummyTrailers.map((trailer) => (
                    <div 
                        key={trailer.image} 
                        className={`relative aspect-video overflow-hidden rounded-lg border transition duration-300 hover:-translate-y-1 cursor-pointer ${currentTrailer.image === trailer.image ? 'border-primary' : 'border-white/10 group-hover:not-hover:opacity-50'}`}
                        onClick={() => setCurrentTrailer(trailer)}
                    >
                        <img src={trailer.image} alt="" className='h-full w-full object-cover brightness-75' />
                        <PlayCircleIcon strokeWidth={1.6} className="absolute top-1/2 left-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 text-white" />
                    </div>
                ))}
            </div>
            </div>
        </section>
    )
}

export default TrailersSection
