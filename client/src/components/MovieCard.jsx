import { CalendarDays, MapPin, StarIcon, Ticket } from 'lucide-react'
import React from 'react'
import { useNavigate } from 'react-router-dom'
import timeFormat from '../lib/timeFormat'
import { useAppContext } from '../context/AppContext'

const getImageUrl = (baseUrl, path) => {
  if (!path) return ''
  return path.startsWith('http') ? path : `${baseUrl}${path}`
}

const MovieCard = ({ movie }) => {
  const navigate = useNavigate()
  const { image_base_url } = useAppContext()
  const currency = import.meta.env.VITE_CURRENCY || "$"
  const nextShow = movie.availableShows?.[0]
  const poster = getImageUrl(image_base_url, movie.poster_path || movie.backdrop_path)
  const genres = movie.genres?.slice(0, 2).map((genre) => genre.name).join(" / ")

  return (
    <article className='cinema-card group flex h-full min-h-[460px] flex-col overflow-hidden rounded-lg transition duration-300 hover:-translate-y-1 hover:border-primary/35'>
      <button
        onClick={() => { navigate(`/movies/${movie._id}`); scrollTo(0, 0) }}
        className='relative block aspect-[2/3] w-full overflow-hidden bg-white/5 text-left'
      >
        {poster ? (
          <img
            src={poster}
            alt={movie.title}
            className='h-full w-full object-cover transition duration-500 group-hover:scale-105'
          />
        ) : (
          <div className='flex h-full items-center justify-center text-gray-500'>No poster</div>
        )}
        <div className='absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent p-3'>
          <div className='inline-flex items-center gap-1 rounded bg-black/60 px-2 py-1 text-xs font-medium'>
            <StarIcon className='h-3.5 w-3.5 fill-primary text-primary' />
            {Number(movie.vote_average || 0).toFixed(1)}
          </div>
        </div>
      </button>

      <div className='flex flex-1 flex-col p-4'>
        <h3 className='line-clamp-1 text-base font-semibold text-white'>{movie.title}</h3>
        <p className='mt-1 line-clamp-1 text-sm text-gray-400'>
          {new Date(movie.release_date).getFullYear()} {genres ? `· ${genres}` : ''} {movie.runtime ? `· ${timeFormat(movie.runtime)}` : ''}
        </p>

        <div className='mt-4 space-y-2 text-xs text-gray-400'>
          {nextShow?.showDateTime && (
            <p className='flex items-center gap-2'>
              <CalendarDays className='h-4 w-4 text-primary' />
              {new Date(nextShow.showDateTime).toLocaleDateString([], { month: 'short', day: 'numeric' })} · {new Date(nextShow.showDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
          {nextShow?.theater && (
            <p className='flex items-center gap-2 line-clamp-1'>
              <MapPin className='h-4 w-4 text-primary' />
              {nextShow.city} · {nextShow.theater}
            </p>
          )}
        </div>

        <div className='mt-auto flex items-center justify-between gap-3 pt-5'>
          <div>
            <p className='text-xs text-gray-500'>From</p>
            <p className='text-lg font-semibold'>{currency}{movie.minPrice || movie.showPrice || 0}</p>
          </div>
          <button
            onClick={() => { navigate(`/movies/${movie._id}`); scrollTo(0, 0) }}
            className='inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold transition hover:bg-primary-dull'
          >
            <Ticket className='h-4 w-4' />
            Tickets
          </button>
        </div>
      </div>
    </article>
  )
}

export default MovieCard
