import {
  Outlet
} from "react-router-dom";

import {
  useState
} from "react";


import AdminSidebar from "../components/admin/AdminSidebar";
import AdminNavbar from "../components/admin/AdminNavbar";


export default function AdminLayout(){

const [collapsed,setCollapsed] =
useState(false);

const [mobileOpen,setMobileOpen] =
useState(false);



return (

<div className="
min-h-screen
bg-gray-50
dark:bg-gray-950
">


{/* DESKTOP SIDEBAR */}

<div className="hidden lg:block">

<AdminSidebar

collapsed={collapsed}

onToggle={()=>
setCollapsed(!collapsed)
}

/>

</div>




{/* MOBILE DRAWER */}

{
mobileOpen && (

<>

{/* OVERLAY */}

<div

onClick={()=>
setMobileOpen(false)
}

className="
fixed
inset-0
z-40
bg-black/50
backdrop-blur-sm
lg:hidden
"

/>



{/* DRAWER */}

<div

className="
fixed
top-0
left-0
z-50
h-screen
w-72
animate-slideIn
lg:hidden
"

>


<AdminSidebar

collapsed={false}

onClose={()=>
setMobileOpen(false)
}

/>


</div>


</>

)

}




{/* MAIN */}

<div

className={`

transition-all
duration-300

${
collapsed
?
"lg:ml-20"
:
"lg:ml-72"
}

`}

>


<AdminNavbar

collapsed={collapsed}

setCollapsed={setCollapsed}

onMobileMenu={()=>
setMobileOpen(true)
}

/>



<main className="
pt-20
p-6
">

<Outlet/>

</main>


</div>


</div>

);

}