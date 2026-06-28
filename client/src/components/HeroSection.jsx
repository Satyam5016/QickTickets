import { ArrowRight, CalendarIcon, ClockIcon, PlayCircle, Sparkles } from 'lucide-react'
import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppContext } from '../context/AppContext'
import timeFormat from '../lib/timeFormat'

const HeroSection = () => {
  const navigate = useNavigate()
  const { shows, image_base_url } = useAppContext()
  const featuredMovie = shows?.[0]
  const heroImage = featuredMovie?.backdrop_path
    ? `${image_base_url}${featuredMovie.backdrop_path}`
    : '/backgroundImage.png'

  return (
    <section className='relative min-h-[92vh] overflow-hidden'>
      <img
        src={heroImage}
        alt={featuredMovie?.title || 'Cinema background'}
        className='absolute inset-0 h-full w-full object-cover'
      />
      <div className='absolute inset-0 bg-[linear-gradient(90deg,rgba(8,9,13,0.95)_0%,rgba(8,9,13,0.72)_44%,rgba(8,9,13,0.2)_100%)]' />
      <div className='absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#08090d] to-transparent' />

      <div className='relative z-10 flex min-h-[92vh] items-center px-6 pt-28 md:px-16 lg:px-36'>
        <div className='max-w-3xl'>
          <div className='mb-5 inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/10 px-3 py-2 text-sm text-gray-200 backdrop-blur'>
            <Sparkles className='h-4 w-4 text-primary' />
            <span>{featuredMovie ? 'Now showing on QuickTickets' : 'Movie tickets made effortless'}</span>
          </div>

          <h1 className='text-balance text-5xl font-bold leading-[1.02] md:text-7xl'>
            {featuredMovie?.title || 'Book better seats for better nights out.'}
          </h1>

          <div className='mt-5 flex flex-wrap items-center gap-4 text-sm text-gray-300'>
            {featuredMovie?.genres?.slice(0, 3).map((genre) => (
              <span key={genre.id || genre.name}>{genre.name}</span>
            ))}
            {featuredMovie?.release_date && (
              <span className='flex items-center gap-1'>
                <CalendarIcon className='h-4 w-4 text-primary' />
                {new Date(featuredMovie.release_date).getFullYear()}
              </span>
            )}
            {featuredMovie?.runtime && (
              <span className='flex items-center gap-1'>
                <ClockIcon className='h-4 w-4 text-primary' />
                {timeFormat(featuredMovie.runtime)}
              </span>
            )}
          </div>

          <p className='mt-5 max-w-xl text-base leading-7 text-gray-300'>
            {featuredMovie?.overview || 'Find movies, choose seats, add snacks, and manage your tickets from a clean booking experience built for real movie nights.'}
          </p>

          <div className='mt-8 flex flex-wrap items-center gap-3'>
            <button
              onClick={() => navigate(featuredMovie ? `/movies/${featuredMovie._id}` : '/movies')}
              className='inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold transition hover:bg-primary-dull'
            >
              {featuredMovie ? 'Book This Movie' : 'Explore Movies'}
              <ArrowRight className='h-5 w-5' />
            </button>
            <button
              onClick={() => navigate('/movies')}
              className='inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/15'
            >
              <PlayCircle className='h-5 w-5 text-primary' />
              View Showtimes
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default HeroSection
