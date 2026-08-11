import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server"

const isLoginRoute = createRouteMatcher(["/login"])

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  const authenticated = await convexAuth.isAuthenticated()

  if (!isLoginRoute(request) && !authenticated) {
    return nextjsMiddlewareRedirect(request, "/login")
  }

  if (isLoginRoute(request) && authenticated) {
    return nextjsMiddlewareRedirect(request, "/")
  }
})

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
}
