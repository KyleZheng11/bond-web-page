import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return (
    <div className="p-8">
      {/* Header Section */}
      <header className="border-b-2 pb-4 mb-6">
        <h1 className="text-2xl font-bold text-center">
          {/* TODO: When user presses Bond, takes back to home page/top of page. */}
          <button>Bond</button> 
        </h1>
      </header>

      {/* Action/Body Statement */}
      <div className="flex justify-center items-center">
        <div className="text-center mt-4 text-lg">
          <div className="text-5xl font-bold mb-6">
            <p>Stop Planning</p>
            <p>Start going out.</p>
          </div>
          <p>Bond makes being with your friends easy and seamless, no matter the situation.</p>
          <button className="border-1 hover:bg-sky-400 rounded-4xl p-2 bg-amber-400 mt-6">
            Get early access
          </button>
        </div>
      </div>

      {/* Video */}
      <div className="flex justify-center items-center m-6">
        <video width="800px" controls autoPlay muted loop>
          <source src="../videos/bond_example.mp4" type="video/mp4" />
          <source src="../videos/bond_example.webm" type="video/webm" />
        </video>
      </div>

      {/* How does Bond Work? */}
      <div className="flex justify-center items-center">
        <div className="text-center mt-4 text-lg w-full">
          <p>How Bond helps your friend group</p>
          <div className="flex justify-evenly items-center w-full gap-4 mt-6">
            <div className="border-2 rounded-2xl p-6 flex-1 text-center"> 
              <p>Create/Join your Crew</p>
            </div>
            <div className="border-2 rounded-2xl p-6 flex-1 text-center"> 
              <p>Bond will then curate a plan</p>
            </div>
            <div className="border-2 rounded-2xl p-6 flex-1 text-center"> 
              <p>All you have to do is just show up!</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center items-center">
        <div className="text-center mt-4 text-lg w-full">
          <p className="font-bold flex justify-evenly items-center w-full gap-4 m-6">Our mission</p>
          <p className="border-2 rounded-2xl p-6 flex-1 text-center">We created Bond because making plans with your friends shouldn't feel like a chore. Our goal is simple, to bring people together easily and seamless.</p>
        </div>
      </div>


      <div className="flex justify-center items-center">
        <div className="text-center mt-4 text-lg w-full">
          <p>Get early access!</p>
        </div>
      </div>
      
    </div>
  )
}
