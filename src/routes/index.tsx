import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <div className="p-8">
      <h1 className="text-4xl font-bold text-center">Welcome to Bond</h1>

      <div className="flex-row">
        <div className="justify-self-center">
          <p className="mt-4 text-lg">
            Stop Planning
          </p>
          <p>
            Start going out.
          </p>
          <p>
            Bond makes being with your friends easy and seamless, no matter the situation.
          </p>
          <button className="border-1 hover:bg-sky-400">
            Get early access
          </button>
        </div>
      </div>

      <p>Everything your friend group needs</p>
      <div>
        <p>Discover</p>
        <p>Plan Together</p>
        <p>Just show up</p>
      </div>

      <div>Our mission</div>


      <div>
        Get early access...waitlist
      </div>
      
    </div>
  )
}
